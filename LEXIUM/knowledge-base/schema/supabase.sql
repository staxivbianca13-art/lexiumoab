-- ═══════════════════════════════════════════════════════════════════════════
-- LEXIUM — Supabase Schema
-- OAB 2ª fase · Direito do Trabalho · Knowledge Base
-- ═══════════════════════════════════════════════════════════════════════════
-- Migração: 001_initial_schema.sql
-- Execute no Supabase SQL Editor ou via supabase db push

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "vector";           -- pgvector para embeddings RAG

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. USUÁRIOS / ALUNOS
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists alunos (
  id            uuid primary key default uuid_generate_v4(),
  auth_user_id  uuid unique references auth.users(id) on delete cascade,
  email         text unique not null,
  nome          text,                      -- opcional, para personalização
  -- Valores batem com os planos reais vendidos em index.html#planos
  -- (data-plan="mensal|premium|simulados") + 'gratuito' como fallback
  -- técnico para contas sem plano definido.
  plano         text not null default 'gratuito'
                  check (plano in ('gratuito','mensal','premium','simulados')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table alunos is 'Perfil do aluno vinculado ao auth.users do Supabase';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SUBMISSÕES (uploads de peças/questões pelo aluno)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists submissoes (
  id              uuid primary key default uuid_generate_v4(),
  aluno_id        uuid not null references alunos(id) on delete cascade,
  tipo            text not null
                    check (tipo in ('peca','questao_discursiva','simulado')),
  tipo_peca       text,   -- 'reclamacao_trabalhista','contestacao','recurso_ordinario', etc.
  enunciado_ref   uuid,   -- FK para kb_questoes (quando o caso vem da base curada)
  enunciado       text,   -- texto do caso prático/enunciado que o aluno respondeu
                          -- (sempre preenchido pelo formulário; enunciado_ref é só
                          -- pra quando o caso também existe estruturado em kb_questoes)
  texto_aluno     text not null,           -- resposta bruta do aluno
  texto_normalizado text,                  -- texto limpo pós-processamento
  status          text not null default 'pendente'
                    check (status in ('pendente','processando','corrigido','erro')),
  criado_em       timestamptz not null default now(),
  processado_em   timestamptz
);

comment on table submissoes is 'Cada upload de peça ou questão que o aluno envia para correção';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CORREÇÕES (resultado da IA para cada submissão)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists correcoes (
  id                uuid primary key default uuid_generate_v4(),
  submissao_id      uuid not null unique references submissoes(id) on delete cascade,
  pontuacao_total   numeric(4,2),          -- ex: 7.40 (escala 0–10)
  pontuacao_peca    numeric(4,2),          -- sub-score da peça (0–5)
  pontuacao_questao numeric(4,2),          -- sub-score das questões (0–5)
  nivel_geral       text                   -- 'insuficiente','regular','bom','excelente'
                      check (nivel_geral in ('insuficiente','regular','bom','excelente')),
  feedback_geral    text,                  -- parágrafo de feedback narrativo
  itens_avaliados   jsonb,                 -- array de { item, status, pontos, feedback }
  erros_criticos    jsonb,                 -- array de erros que zeraram pontos
  pontos_fortes     jsonb,                 -- array de acertos do aluno
  fundamentos_ausentes jsonb,              -- fundamentos legais não citados
  comparacao_espelho jsonb,                -- diff vs modelo (RAG match)
  modelo_ia         text,                  -- 'claude-sonnet-4-6', etc.
  tokens_usados     int,
  criado_em         timestamptz not null default now()
);

comment on table correcoes is 'Resultado completo da correção por IA para cada submissão';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. COMPETÊNCIAS (mapa do que a FGV avalia)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists competencias (
  id          text primary key,            -- ex: 'estrutura_peca', 'fundamentacao_legal'
  nome        text not null,
  descricao   text,
  categoria   text not null               -- 'peca' | 'questao' | 'geral'
                check (categoria in ('peca','questao','geral')),
  peso        numeric(3,2) default 1.0,   -- peso relativo (0.5–2.0)
  ativo       boolean default true
);

-- Seed competências FGV
insert into competencias (id, nome, descricao, categoria, peso) values
  ('estrutura_formal',    'Estrutura Formal',        'Endereçamento, qualificação, petição inicial/contestação adequados', 'peca', 1.0),
  ('pedidos_corretos',    'Pedidos Corretos',        'Todos os pedidos cabíveis identificados e formulados', 'peca', 1.5),
  ('fundamentacao_legal', 'Fundamentação Legal',     'Cita artigos, súmulas e OJs corretamente', 'peca', 1.5),
  ('tecnica_processual',  'Técnica Processual',      'Uso correto de ritos, prazos, recursos', 'peca', 1.0),
  ('valor_causa',         'Valor da Causa',          'Indicação correta do valor da causa', 'peca', 0.5),
  ('provas_requeridas',   'Requerimento de Provas',  'Solicita produção de provas adequadas', 'peca', 0.5),
  ('honorarios',          'Honorários Advocatícios', 'Pleito de honorários (art. 791-A CLT)', 'peca', 0.5),
  ('resposta_objetiva',   'Resposta Objetiva',       'Responde diretamente ao que foi perguntado', 'questao', 1.0),
  ('justificativa',       'Justificativa Jurídica',  'Fundamenta com argumentos jurídicos além da transcrição', 'questao', 1.5),
  ('precisao_tecnica',    'Precisão Técnica',        'Não confunde institutos, aplica corretamente a legislação', 'questao', 1.0)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. DIAGNÓSTICO POR COMPETÊNCIA (evolução do aluno)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists diagnostico_competencias (
  id              uuid primary key default uuid_generate_v4(),
  aluno_id        uuid not null references alunos(id) on delete cascade,
  competencia_id  text not null references competencias(id),
  correcao_id     uuid references correcoes(id),
  pontuacao       numeric(4,2) not null,   -- 0–10 nessa competência
  registrado_em   timestamptz not null default now()
);

comment on table diagnostico_competencias is 'Score por competência a cada correção — alimenta o módulo Diagnóstico';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. BASE DE CONHECIMENTO — Chunks de conteúdo
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists kb_chunks (
  id          uuid primary key default uuid_generate_v4(),
  -- Chave estável do chunk de origem (ex: 'penal-013', vinda do id no JSON curado
  -- em knowledge-base/content/topics/*.json). Permite reseed idempotente via
  -- upsert (on_conflict=chunk_key) em vez de duplicar linhas a cada execução
  -- de scripts/seed_knowledge_base.py.
  chunk_key   text unique,
  fonte       text not null,              -- 'direito-material','provas-anteriores', etc.
  section     text,                       -- seção dentro da fonte
  texto       text not null,
  tipo        text not null default 'topico'
                check (tipo in ('topico','peca_modelo','espelho','questao','sumula','erro_recorrente')),
  temas       text[],                     -- ['horas_extras','fgts', ...]
  embedding   vector(1536),               -- OpenAI text-embedding-3-small (1536d)
                                          -- ou vector(3072) para text-embedding-3-large
  metadados   jsonb,
  criado_em   timestamptz not null default now()
);

comment on table kb_chunks is 'Fragmentos indexados da base de conhecimento para RAG';

-- Index para busca vetorial (IVFFlat para datasets < 1M rows)
create index if not exists kb_chunks_embedding_idx
  on kb_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index por tipo para filtros
create index if not exists kb_chunks_tipo_idx on kb_chunks(tipo);
create index if not exists kb_chunks_fonte_idx on kb_chunks(fonte);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. BASE DE CONHECIMENTO — Peças modelo
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists kb_pecas (
  id                    uuid primary key default uuid_generate_v4(),
  -- Chave estável vinda do id do exame no JSON de origem (ex: 'prova-xxv-exame'),
  -- pro mesmo motivo do chunk_key em kb_chunks: reseed idempotente.
  external_id           text unique,
  referencia_exame      text,             -- 'XXV Exame', '38° Exame', etc.
  tipo_peca             text not null,    -- 'reclamacao_trabalhista','contestacao','recurso_ordinario'
  enunciado             text not null,
  resolucao_modelo      text,
  espelho_pontuacao     jsonb,            -- array de { item, pontos_max, fundamento }
  temas                 text[],
  fundamentos_legais    text[],           -- ['Art. 840 CLT', 'LC 150/2015', ...]
  ativo                 boolean default true,
  criado_em             timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. BASE DE CONHECIMENTO — Questões discursivas
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists kb_questoes (
  id                uuid primary key default uuid_generate_v4(),
  referencia_exame  text,
  enunciado         text not null,
  itens             jsonb,               -- [{ letra:'A', texto:'...', pontos:0.65 }]
  respostas_modelo  jsonb,               -- [{ letra:'A', resposta:'...', fundamento:'...' }]
  temas             text[],
  nivel_dificuldade text check (nivel_dificuldade in ('basico','medio','avancado')),
  ativo             boolean default true,
  criado_em         timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. BASE DE CONHECIMENTO — Fundamentos legais (Súmulas, OJs, Artigos)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists kb_fundamentos (
  id          uuid primary key default uuid_generate_v4(),
  tipo        text not null check (tipo in ('sumula_tst','oj_sdi1','oj_sdi2','artigo_clt','artigo_cf','artigo_lei','lei')),
  referencia  text not null unique,      -- 'Súmula 244 TST', 'Art. 7º XIV CF', etc.
  texto       text not null,
  temas       text[],
  status      text not null default 'vigente'
                check (status in ('vigente','cancelada','alterada_parcialmente','nao_aplicavel')),
  observacao  text,                      -- ex: "§4º declarado inconstitucional pelo STF (ADC 48)"
  atualizado_em timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. ERROS RECORRENTES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists kb_erros_recorrentes (
  id          uuid primary key default uuid_generate_v4(),
  descricao   text not null,
  tipo_peca   text,
  tema        text,
  gravidade   text check (gravidade in ('leve','media','grave','critica')),
  como_evitar text,
  fundamento  text                       -- artigo ou súmula relacionada
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. SIMULADOS
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists simulados (
  id            uuid primary key default uuid_generate_v4(),
  aluno_id      uuid not null references alunos(id) on delete cascade,
  nome          text,
  peca_id       uuid references kb_pecas(id),
  questao_id    uuid references kb_questoes(id),
  status        text default 'em_andamento'
                  check (status in ('em_andamento','entregue','corrigido')),
  iniciado_em   timestamptz not null default now(),
  entregue_em   timestamptz,
  tempo_limite  interval default '4 hours',
  resultado_id  uuid references correcoes(id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. SESSÕES DE ESTUDO (tracking de uso)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists sessoes_estudo (
  id          uuid primary key default uuid_generate_v4(),
  aluno_id    uuid not null references alunos(id) on delete cascade,
  modulo      text not null
                check (modulo in ('correcao','diagnostico','evolucao','simulados','base_estudos')),
  iniciado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  duracao_min  int generated always as (
    extract(epoch from (encerrado_em - iniciado_em))::int / 60
  ) stored
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

alter table alunos                    enable row level security;
alter table submissoes                enable row level security;
alter table correcoes                 enable row level security;
alter table diagnostico_competencias  enable row level security;
alter table simulados                 enable row level security;
alter table sessoes_estudo            enable row level security;

-- Alunos só veem/editam seus próprios dados
create policy "aluno_select_own" on alunos
  for select using (auth.uid() = auth_user_id);

create policy "aluno_update_own" on alunos
  for update using (auth.uid() = auth_user_id);

create policy "submissoes_own" on submissoes
  for all using (
    aluno_id = (select id from alunos where auth_user_id = auth.uid())
  );

create policy "correcoes_own" on correcoes
  for select using (
    submissao_id in (
      select id from submissoes where aluno_id = (
        select id from alunos where auth_user_id = auth.uid()
      )
    )
  );

create policy "diagnostico_own" on diagnostico_competencias
  for all using (
    aluno_id = (select id from alunos where auth_user_id = auth.uid())
  );

create policy "simulados_own" on simulados
  for all using (
    aluno_id = (select id from alunos where auth_user_id = auth.uid())
  );

create policy "sessoes_own" on sessoes_estudo
  for all using (
    aluno_id = (select id from alunos where auth_user_id = auth.uid())
  );

-- KB é pública (read-only para alunos autenticados)
create policy "kb_chunks_read"      on kb_chunks      for select using (auth.role() = 'authenticated');
create policy "kb_pecas_read"       on kb_pecas       for select using (auth.role() = 'authenticated');
create policy "kb_questoes_read"    on kb_questoes    for select using (auth.role() = 'authenticated');
create policy "kb_fundamentos_read" on kb_fundamentos for select using (auth.role() = 'authenticated');
create policy "kb_erros_read"       on kb_erros_recorrentes for select using (auth.role() = 'authenticated');
create policy "competencias_read"   on competencias   for select using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. FUNÇÕES ÚTEIS
-- ═══════════════════════════════════════════════════════════════════════════

-- Busca semântica na knowledge base
create or replace function search_kb(
  query_embedding vector(1536),
  filter_tipo     text default null,
  filter_temas    text[] default null,
  match_count     int default 5
)
returns table (
  id        uuid,
  fonte     text,
  section   text,
  texto     text,
  tipo      text,
  temas     text[],
  similarity float
)
language sql stable
as $$
  select
    id, fonte, section, texto, tipo, temas,
    1 - (embedding <=> query_embedding) as similarity
  from kb_chunks
  where
    (filter_tipo is null or tipo = filter_tipo)
    and (filter_temas is null or temas && filter_temas)
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Score médio por competência (para o módulo Diagnóstico)
create or replace function get_diagnostico(p_aluno_id uuid)
returns table (
  competencia_id   text,
  nome             text,
  media_score      numeric,
  total_avaliacoes bigint,
  ultima_avaliacao timestamptz
)
language sql stable
as $$
  select
    c.id, c.nome,
    round(avg(d.pontuacao), 2) as media_score,
    count(*) as total_avaliacoes,
    max(d.registrado_em) as ultima_avaliacao
  from diagnostico_competencias d
  join competencias c on c.id = d.competencia_id
  where d.aluno_id = p_aluno_id
  group by c.id, c.nome
  order by media_score asc;  -- ordenado do mais fraco ao mais forte
$$;

-- Evolução temporal do aluno
create or replace function get_evolucao(
  p_aluno_id  uuid,
  p_periodo   int default 30  -- dias
)
returns table (
  data_avaliacao date,
  media_dia      numeric,
  total_dia      bigint
)
language sql stable
as $$
  select
    date(c.criado_em) as data_avaliacao,
    round(avg(c.pontuacao_total), 2) as media_dia,
    count(*) as total_dia
  from correcoes c
  join submissoes s on s.id = c.submissao_id
  where s.aluno_id = p_aluno_id
    and c.criado_em >= now() - (p_periodo || ' days')::interval
  group by date(c.criado_em)
  order by data_avaliacao;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Atualiza 'atualizado_em' automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end;
$$;

create trigger alunos_updated_at
  before update on alunos
  for each row execute function set_updated_at();

-- Após correcao inserida, grava diagnóstico por competência
create or replace function sync_diagnostico()
returns trigger language plpgsql as $$
declare
  v_aluno_id uuid;
  v_item jsonb;
begin
  select s.aluno_id into v_aluno_id
  from submissoes s where s.id = new.submissao_id;

  if new.itens_avaliados is not null then
    for v_item in select * from jsonb_array_elements(new.itens_avaliados)
    loop
      if (v_item->>'competencia_id') is not null then
        insert into diagnostico_competencias (aluno_id, competencia_id, correcao_id, pontuacao)
        values (
          v_aluno_id,
          v_item->>'competencia_id',
          new.id,
          (v_item->>'pontuacao')::numeric
        );
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger correcoes_sync_diagnostico
  after insert on correcoes
  for each row execute function sync_diagnostico();

-- Cria o perfil em `alunos` automaticamente quando alguém se cadastra via
-- Supabase Auth — seja por signUp() direto no client, seja (fluxo padrão
-- do produto) por convite enviado pelo webhook do Mercado Pago após
-- pagamento aprovado (ver api/mp-webhook.js). Não existe policy de INSERT
-- em `alunos` porque a criação do perfil deve acontecer só por este
-- trigger (security definer, ignora RLS) — nunca por insert direto do
-- cliente. `nome`/`plano` vêm de `data` passado no signUp() ou no convite;
-- sem plano informado, cai no default 'gratuito' da própria tabela.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.alunos (auth_user_id, email, nome, plano)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nome',
    coalesce(new.raw_user_meta_data->>'plano', 'gratuito')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

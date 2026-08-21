# LEXIUM — Knowledge Base Architecture
**OAB 2ª fase · Direito do Trabalho · Base de Conhecimento**

---

## 1. Visão Geral

A Knowledge Base (KB) é a camada de dados que alimenta todos os módulos inteligentes da LEXIUM. É um sistema híbrido: **banco relacional** (Supabase/PostgreSQL) para dados estruturados + **busca vetorial** (pgvector) para recuperação semântica (RAG).

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEXIUM Platform                          │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │ Correção │  │Diagnóst. │  │ Evolução │  │  Simulados   │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│        │              │              │                │          │
│   ┌────▼──────────────▼──────────────▼────────────────▼───────┐ │
│   │                  API / Claude (IA)                         │ │
│   └──────────────────────────┬──────────────────────────────┘ │
│                               │                                  │
│   ┌───────────────────────────▼──────────────────────────────┐  │
│   │                   Knowledge Base                          │  │
│   │                                                           │  │
│   │  kb_chunks (pgvector) ←→ kb_pecas ←→ kb_questoes        │  │
│   │  kb_fundamentos ←→ kb_erros_recorrentes ←→ competencias  │  │
│   └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Arquivos

```
knowledge-base/
├── ARCHITECTURE.md          ← este arquivo
├── AUDIT-REPORT.md          ← auditoria dos 9 PDFs de origem
│
├── schema/
│   ├── supabase.sql         ← schema completo PostgreSQL + RLS + funções
│   └── rag-embeddings.md   ← guia de configuração do RAG e ingestão
│
├── content/
│   ├── pieces/
│   │   └── treino-pecas.json        ← 4 peças modelo com espelhos FGV
│   │
│   ├── mirrors/
│   │   └── espelhos-pecas-treino.json  ← 20 tabelas de pontuação FGV
│   │
│   ├── questions/
│   │   ├── provas-anteriores.json   ← 24 blocos (XXV ao 38° Exame)
│   │   ├── questoes-autorais.json   ← questões de treino (35 chunks)
│   │   ├── questoes_mentorias.json  ← questões de mentoria (13 chunks)
│   │   └── revisao_turbo.json       ← revisão acelerada 46° Exame (39 chunks)
│   │
│   ├── topics/
│   │   ├── direito-material.json    ← DT completo (214 chunks, 453KB)
│   │   ├── direito-processual.json  ← DPT completo (171 chunks, 376KB)
│   │   └── aulas-relevantes.json   ← DT+DPT (271 chunks, 573KB)
│   │
│   ├── legal-basis/
│   │   └── sumulas-revogadas.json  ← 34 dispositivos revogados/inconst.
│   │
│   ├── competencies/               ← (no schema, não em arquivo separado)
│   ├── errors/                     ← (a popular após primeiras correções)
│   └── checklists/                 ← (a popular — ver roadmap)
│
└── audit/
    └── (relatórios futuros de qualidade da base)
```

---

## 3. Modelo de Dados

### 3.1 Tabelas principais

| Tabela | Propósito | Linhas esperadas |
|--------|-----------|-----------------|
| `alunos` | Perfil do aluno (1:1 com auth.users) | 1–10k |
| `submissoes` | Cada upload de peça/questão | 10–100k |
| `correcoes` | Resultado da correção por IA | 10–100k |
| `diagnostico_competencias` | Score por competência por correção | 100k–1M |
| `simulados` | Sessões de simulado | 5–50k |
| `sessoes_estudo` | Tracking de uso por módulo | 50k–500k |

### 3.2 Tabelas da Knowledge Base

| Tabela | Propósito | Linhas esperadas |
|--------|-----------|-----------------|
| `kb_chunks` | Fragmentos indexados (RAG) | 1k–5k |
| `kb_pecas` | Peças modelo com espelhos | 30–100 |
| `kb_questoes` | Questões discursivas | 100–500 |
| `kb_fundamentos` | Súmulas, OJs, artigos | 200–500 |
| `kb_erros_recorrentes` | Erros tipificados | 50–200 |
| `competencias` | Mapa de competências FGV | 10 (fixo) |

---

## 4. Como Cada Módulo Usa a Knowledge Base

### 4.1 Módulo Correção (Nova Correção → Processando → Relatório)

```
Aluno envia texto
     │
     ▼
1. Normalizar texto (limpar, detectar tipo: peça ou questão)
     │
     ▼
2. RAG: buscar em kb_chunks com filtros:
   - tipo IN ('espelho', 'peca_modelo') para peças
   - tipo IN ('topico', 'espelho') para questões
   - similarity > 0.70
     │
     ▼
3. Montar prompt Claude:
   - System: instruções de correção + critérios FGV
   - Context: chunks recuperados (espelhos + modelos)
   - User: texto do aluno
     │
     ▼
4. Claude retorna JSON estruturado:
   { pontuacao_total, itens_avaliados[], erros_criticos[], ... }
     │
     ▼
5. Salvar em correcoes + trigger sync_diagnostico()
     │
     ▼
6. Exibir Relatório para o aluno
```

**Checklist de correção para Reclamação Trabalhista:**
- [ ] Endereçamento correto (Juízo + Vara + Cidade)
- [ ] Qualificação completa (reclamante + reclamada)
- [ ] Todos os pedidos cabíveis identificados
- [ ] Cada pedido com fundamentação (art. / súmula) — não só transcrição
- [ ] Reflexos nas verbas rescisórias (quando houver horas extras, etc.)
- [ ] Requerimento de provas (documental, testemunhal, pericial)
- [ ] Honorários advocatícios (art. 791-A CLT)
- [ ] Valor da causa
- [ ] Pedido de gratuidade (se aplicável)
- [ ] Local, data, advogado (OAB + assinatura)

**Checklist de correção para Contestação:**
- [ ] Endereçamento correto (indicação do processo)
- [ ] Qualificação da reclamada
- [ ] Preliminares (se cabíveis): prescrição, ilegitimidade, carência, etc.
- [ ] Impugnação de cada pedido da inicial
- [ ] Fundamentos legais por pedido (não só negativa genérica)
- [ ] Pedido de improcedência total ou parcial
- [ ] Requerimento de provas

### 4.2 Módulo Diagnóstico

Alimentado pelo trigger `sync_diagnostico()` que grava um score por competência após cada correção.

**Competências avaliadas:**
1. Estrutura Formal (endereçamento, qualificação, encerramento)
2. Pedidos Corretos (identificação e formulação de todos os pedidos)
3. Fundamentação Legal (citação correta de artigos, súmulas, OJs)
4. Técnica Processual (rito, prazos, recursos adequados)
5. Valor da Causa
6. Requerimento de Provas
7. Honorários Advocatícios
8. Resposta Objetiva (para questões discursivas)
9. Justificativa Jurídica (argumentação além da transcrição)
10. Precisão Técnica (não confunde institutos)

**Query para o painel de Diagnóstico:**
```sql
select * from get_diagnostico('uuid-do-aluno');
-- Retorna: competência → média → total avaliações → última avaliação
-- Ordenado do mais fraco ao mais forte → prioriza estudo
```

### 4.3 Módulo Evolução

Gráficos de progresso temporal usando a função `get_evolucao()`:
```sql
select * from get_evolucao('uuid-do-aluno', 30); -- últimos 30 dias
```

Exibe: pontuação média por dia + total de submissões.

### 4.4 Módulo Simulados

Seleciona uma `kb_peca` + uma `kb_questao` para o simulado:
```sql
-- Selecionar questão não usada recentemente pelo aluno
select q.* from kb_questoes q
where q.id not in (
  select s.questao_id from simulados s where s.aluno_id = $aluno_id
)
order by random()
limit 1;
```

Timer de 4 horas no frontend. Ao entregar, envia para o pipeline de Correção.

### 4.5 Módulo Base de Estudos

Busca híbrida: full-text search + busca vetorial nos `kb_chunks`:
```sql
-- Busca textual simples (para filtros de tema)
select * from kb_chunks
where 'horas_extras' = any(temas)
limit 20;

-- Busca semântica (para perguntas em linguagem natural)
select * from search_kb(
  query_embedding := <embedding da pergunta>,
  filter_tipo := 'topico',
  match_count := 5
);
```

---

## 5. Fluxo de Ingestão de Novos Materiais

Quando novos PDFs chegarem (futuras provas, novas súmulas, etc.):

```
PDF → pdfminer (extract_text) → clean() → chunk (~1500 chars) → JSON
                                                                    │
                                                                    ▼
                                            scripts/ingest-kb.js (OpenAI embeddings)
                                                                    │
                                                                    ▼
                                                     kb_chunks (Supabase pgvector)
```

**Regras de limpeza obrigatórias antes de ingestão:**
1. Remover nomes de professores, marcas de cursos, dados institucionais
2. Remover numeração de páginas isolada
3. Remover mensagens de marketing/motivacionais
4. Verificar se há PII (CPF, e-mail, telefone) e remover
5. Verificar se o dispositivo citado não está na lista `sumulas-revogadas.json`

---

## 6. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Banco principal | Supabase (PostgreSQL) | Auth + RLS integrado, pgvector nativo, Edge Functions |
| Embeddings | OpenAI text-embedding-3-small | Custo ~$0.004 para toda a base atual |
| Vector search | pgvector IVFFlat | Integrado ao Supabase, sem infra extra |
| IA de correção | Claude (Anthropic) | Melhor compreensão de texto jurídico em português |
| Chunking | 1500–2000 chars com sobreposição de 200 | Equilibra contexto e precisão da busca |
| Threshold de similaridade | 0.70 (cosine) | Abaixo disso, contexto irrelevante prejudica a correção |

---

## 7. Segurança e LGPD

- **RLS habilitado** em todas as tabelas de dados do aluno
- **kb_chunks** é somente-leitura para alunos autenticados — nunca exposto diretamente
- **Textos dos alunos** são armazenados em `submissoes.texto_aluno` mas NÃO são usados para treinar modelos
- **Embeddings** são gerados server-side; o texto nunca passa pelo frontend
- O campo `nome` do aluno é opcional — a plataforma funciona sem PII de identificação
- `SUPABASE_SERVICE_KEY` nunca vai para o frontend — apenas Edge Functions / backend

---

## 8. Roadmap da Base de Conhecimento

### Curto prazo (antes do lançamento)
- [ ] Executar ingestão completa (`scripts/ingest-kb.js`)
- [ ] Popular `kb_pecas` com as 4 peças de treino + 12 provas anteriores
- [ ] Popular `kb_fundamentos` com súmulas TST vigentes mais cobradas
- [ ] Criar checklists por tipo de peça em `content/checklists/`

### Médio prazo (pós-lançamento)
- [ ] Adicionar provas do 39° ao 45° Exame
- [ ] Criar casos práticos inéditos para o módulo Simulados
- [ ] Popular `kb_erros_recorrentes` com erros dos primeiros alunos reais
- [ ] Implementar feedback loop: quando aluno corrige erro → atualizar peso da competência

### Longo prazo
- [ ] Fine-tuning de modelo específico para correção OAB (se volume > 10k correções)
- [ ] Expandir para outras disciplinas da 2ª fase (Empresarial, Civil, etc.)
- [ ] Integrar jurisprudência atualizada via API do TST/STF

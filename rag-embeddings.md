# LEXIUM — RAG & Embeddings Setup

## Visão Geral

O sistema RAG (Retrieval-Augmented Generation) é o núcleo técnico dos módulos **Correção** e **Base de Estudos**. Quando um aluno envia uma peça ou questão, o sistema:

1. Converte o texto do aluno em embedding vetorial
2. Busca os chunks mais similares na base de conhecimento (espelhos, modelos, temas)
3. Injeta esses chunks como contexto no prompt de correção para o Claude
4. O Claude compara a peça do aluno com os modelos e gera feedback preciso

## Configuração Técnica

### Provider de Embeddings (Escolha um)

**Opção A — OpenAI text-embedding-3-small (Recomendado)**
- Dimensão: 1536
- Custo: ~$0.02/1M tokens
- Uso: `POST https://api.openai.com/v1/embeddings`

**Opção B — OpenAI text-embedding-3-large**
- Dimensão: 3072 (alterar `vector(3072)` no schema)
- Custo: ~$0.13/1M tokens
- Maior qualidade para textos jurídicos técnicos

**Opção C — Voyage AI voyage-law-2 (Específico para direito)**
- Dimensão: 1024
- Excelente para documentos jurídicos em português
- Requer ajuste no schema: `vector(1024)`

### Configuração no Supabase

```sql
-- Verificar que pgvector está instalado
select * from pg_extension where extname = 'vector';

-- Ajustar listas do index baseado no volume de chunks
-- Regra: lists = sqrt(total_chunks) * 3 (arredondado)
-- Exemplo: 1000 chunks → lists ≈ 100
create index kb_chunks_embedding_idx
  on kb_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

### Variáveis de Ambiente (.env)

```bash
OPENAI_API_KEY=sk-...           # Para embeddings
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...    # Service key para operações server-side
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## Pipeline de Indexação

### Script de Ingestão (Node.js / Supabase Edge Function)

```javascript
// scripts/ingest-kb.js
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // max tokens safety
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

async function ingestFile(jsonPath, tipo) {
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const chunks = data.chunks || data.pecas || data.exames || [];

  console.log(`Ingesting ${chunks.length} chunks from ${jsonPath}`);

  for (const chunk of chunks) {
    const texto = chunk.texto || chunk.enunciado || JSON.stringify(chunk);
    if (!texto || texto.length < 50) continue;

    const embedding = await getEmbedding(texto);

    await supabase.from('kb_chunks').upsert({
      id: chunk.id,
      fonte: data.fonte || tipo,
      section: chunk.section || null,
      texto: texto.slice(0, 10000),
      tipo: tipo,
      temas: chunk.temas || [],
      embedding,
      metadados: {
        referencia_exame: chunk.exame || chunk.referencia_exame,
        tipo_peca: chunk.tipo_peca,
      },
    }, { onConflict: 'id' });

    // Rate limit: 3000 RPM for text-embedding-3-small
    await new Promise(r => setTimeout(r, 25));
  }
}

// Executar ingestão
await ingestFile('./content/topics/direito-material.json', 'topico');
await ingestFile('./content/topics/direito-processual.json', 'topico');
await ingestFile('./content/topics/aulas-relevantes.json', 'topico');
await ingestFile('./content/topics/revisao_turbo.json', 'topico');
await ingestFile('./content/questions/provas-anteriores.json', 'peca_modelo');
await ingestFile('./content/pieces/treino-pecas.json', 'peca_modelo');
await ingestFile('./content/mirrors/espelhos-pecas-treino.json', 'espelho');
await ingestFile('./content/legal-basis/sumulas-revogadas.json', 'sumula');

console.log('✓ Ingestão concluída');
```

### Executar Ingestão

```bash
cd knowledge-base
npm install @supabase/supabase-js openai
node scripts/ingest-kb.js
```

Estimativa de custo: ~756K chars ÷ 4 chars/token ≈ 189K tokens × $0.00002 ≈ **$0.004** (menos de 1 centavo)

## Pipeline de Busca (Correção)

### Função de Busca na API

```javascript
// api/search-kb.js
export async function searchKB(queryText, options = {}) {
  const { tipo, temas, topK = 5 } = options;
  
  // 1. Gerar embedding da query
  const embedding = await getEmbedding(queryText);
  
  // 2. Buscar chunks similares
  const { data, error } = await supabase.rpc('search_kb', {
    query_embedding: embedding,
    filter_tipo: tipo || null,
    filter_temas: temas || null,
    match_count: topK,
  });
  
  if (error) throw error;
  return data.filter(row => row.similarity > 0.7); // threshold de relevância
}
```

### Prompt de Correção com RAG

```javascript
// api/corrigir.js
async function buildCorrectionPrompt(textoAluno, tipoSubmissao) {
  // Buscar contexto relevante
  const [espelhos, modelos, temas] = await Promise.all([
    searchKB(textoAluno, { tipo: 'espelho', topK: 3 }),
    searchKB(textoAluno, { tipo: 'peca_modelo', topK: 2 }),
    searchKB(textoAluno, { tipo: 'topico', topK: 5 }),
  ]);

  const contextBlock = [
    espelhos.length ? `## Espelhos de Correção FGV\n${espelhos.map(r => r.texto).join('\n---\n')}` : '',
    modelos.length  ? `## Modelos de Referência\n${modelos.map(r => r.texto).join('\n---\n')}` : '',
    temas.length    ? `## Conteúdo Relevante\n${temas.map(r => r.texto).join('\n---\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return `
Você é o sistema de correção de peças e questões da OAB 2ª fase, especializado em Direito do Trabalho.

## Contexto da Base de Conhecimento
${contextBlock}

## Texto Submetido pelo Aluno
${textoAluno}

## Tarefa
Corrija a ${tipoSubmissao} acima seguindo os critérios da FGV para a OAB 2ª fase.
Responda exclusivamente em JSON com a estrutura:
{
  "pontuacao_total": number,
  "pontuacao_peca": number,
  "nivel_geral": "insuficiente|regular|bom|excelente",
  "feedback_geral": string,
  "itens_avaliados": [{ "item": string, "status": "ok|parcial|ausente", "pontos": number, "feedback": string }],
  "erros_criticos": [string],
  "pontos_fortes": [string],
  "fundamentos_ausentes": [string]
}
`;
}
```

## Estratégia de Chunking

| Tipo de Conteúdo | Tamanho do Chunk | Sobreposição |
|------------------|-----------------|--------------|
| Tópicos DT/DPT   | 1500–2000 chars | 200 chars    |
| Peças modelo     | Peça inteira (~4000 chars) | Nenhuma |
| Espelhos FGV     | Por item avaliado | Nenhuma |
| Questões         | Por item (A, B, C) | Nenhuma |
| Súmulas/OJs      | Por dispositivo | Nenhuma |

## Manutenção

- **Atualizar base**: re-executar `ingest-kb.js` após adicionar novos arquivos JSON em `content/`
- **Atualização pós-exame**: após cada exame OAB, adicionar questões em `content/questions/provas-anteriores.json`
- **Súmulas revogadas**: manter `content/legal-basis/sumulas-revogadas.json` atualizado após cada Reforma ou decisão do STF/TST

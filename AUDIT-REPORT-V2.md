# LEXIUM — Relatório de Auditoria da Base de Conhecimento v2.0

**Gerado em:** Julho 2026  
**Referência:** 46º Exame OAB 2ª Fase  
**Cobertura:** Todas as áreas da 2ª Fase OAB (7 áreas jurídicas)  
**Total de arquivos auditados:** 12 PDFs + materiais anteriores da sessão 1

---

## 1. INVENTÁRIO COMPLETO DOS MATERIAIS

### 1.1 Materiais processados nesta sessão (12 PDFs)

| Arquivo | Área | Tipo | Tamanho (chars) | Status |
|---------|------|------|-----------------|--------|
| pdf_empresarial.txt | Direito Empresarial | Revisão Turbo | 81.026 | ✅ Processado |
| pdf_civil_1.txt | Direito Civil (Parte Geral + Contratos + Processo) | Revisão Turbo | 97.472 | ✅ Processado |
| pdf_civil_2.txt | Direito Civil (Família + Sucessões + Obrigações + Processo) | Revisão Turbo | 185.760 | ✅ Processado |
| pdf_penal_1.txt | Direito Penal (Parte Geral + Processo Penal) | Revisão Turbo | 34.991 | ✅ Processado |
| pdf_penal_2.txt | Direito Penal (Leis Especiais + Processo Penal) | Semana de Revisão | 61.841 | ✅ Processado |
| pdf_constitucional_1.txt | Direito Constitucional (Parte 1 — Organização do Estado) | Semana de Revisão | 79.604 | ✅ Processado |
| pdf_constitucional_2.txt | Direito Constitucional (Parte 2 — Controle, Remédios, Recursos) | Semana de Revisão | 19.852 | ✅ Processado |
| pdf_tributario_1.txt | Direito Tributário (Conceitos + Princípios + Imunidades) | Revisão Turbo | 22.806 | ✅ Processado |
| pdf_tributario_2.txt | Direito Tributário (Peças + Estrutura + Súmulas) | Revisão Turbo | 12.676 | ✅ Processado |
| pdf_admin_1.txt | Direito Administrativo (MS + Licitação + Serviços) | Revisão Turbo | 271.193 | ✅ Processado |
| pdf_admin_2.txt | Direito Administrativo (PAD + Licitações + Contratos + Responsabilidade) | Revisão Turbo | 424.000 | ✅ Processado |
| pdf_trabalho_sup.txt | Direito do Trabalho (suplementar) | Revisão Turbo | 69.929 | ✅ Processado |

### 1.2 Materiais pré-existentes (Sessão 1)

| Arquivo JSON | Área | Chunks | Status |
|-------------|------|--------|--------|
| direito-material.json | Direito do Trabalho (material) | 214 | ✅ Existente |
| direito-processual.json | Direito do Trabalho (processual) | 171 | ✅ Existente |
| aulas-relevantes.json | Direito do Trabalho (aulas) | 271 | ✅ Existente |
| espelhos-pecas-treino.json | FGV Rubrics DT (20 espelhos) | 55KB | ✅ Existente |
| provas-anteriores.json | Provas reais DT (XXV–38º) | 24 blocos | ✅ Existente |
| tabela-identificacao-pecas.json | Mapeamento de peças (36 tipos) | 36 peças | ✅ Existente |
| sumulas-revogadas.json | Súmulas revogadas | 34 provisões | ✅ Existente |

---

## 2. CLASSIFICAÇÃO POR ÁREA E TIPO DE CONTEÚDO

### 2.1 Direito Empresarial
- **Peças cobradas (histórico):** Peça Prático-Profissional única por exame — FGV cobra questões discursivas + 1 peça
- **Temas recorrentes:** Sociedades (Ltda, SA, SCP, Cooperativa), contratos empresariais (franquia, representação, transporte, corretagem), alienação fiduciária, desconsideração PJ, ME/EPP, títulos de crédito
- **Chunks gerados:** 13
- **JSON:** `knowledge-base/content/topics/direito-empresarial.json`

### 2.2 Direito Civil
- **Peças cobradas:** Apelação (frequentíssima), Contestação, Petição Inicial (ações possessórias, indenizatórias, alimentos, embargos de terceiro), Agravo de Instrumento, Recurso Especial
- **Temas recorrentes:** Contratos, obrigações, CDC, alimentos, sucessões, responsabilidade civil, posse, usucapião, recursos, processo civil
- **Chunks gerados:** 17
- **JSON:** `knowledge-base/content/topics/direito-civil.json`

### 2.3 Direito Penal
- **Peças cobradas:** Apelação (top 1), Resposta à Acusação, Habeas Corpus/Relaxamento, RESE, Contrarrazões, Agravo em Execução, Queixa-Crime, Revisão Criminal
- **Temas recorrentes:** Teoria da Pena, Crimes em espécie, Tipicidade, Leis Especiais (Drogas, Tortura, ORCRIM, Hediondos, LMP), Recursos Penais, Prisões e Liberdades
- **Chunks gerados:** 12
- **JSON:** `knowledge-base/content/topics/direito-penal.json`

### 2.4 Direito Constitucional
- **Peças cobradas:** ADI (frequentíssima), Habeas Data, Recurso Ordinário, MS, ADPF, ADC, ADO
- **Temas recorrentes:** Controle de constitucionalidade, competências federativas, processo legislativo, remédios constitucionais, direitos fundamentais, organização dos poderes
- **Chunks gerados:** 10
- **JSON:** `knowledge-base/content/topics/direito-constitucional.json`

### 2.5 Direito Tributário
- **Peças cobradas:** Mandado de Segurança (top 1 — ~8x), Apelação (~7x), Agravo de Instrumento (~7x), Ação Anulatória (~6x), Repetição de Indébito (~5x)
- **Temas recorrentes:** Impostos em espécie, limitações ao poder de tributar, crédito tributário, competência, taxas, imunidades
- **Chunks gerados:** 14
- **JSON:** `knowledge-base/content/topics/direito-tributario.json`

### 2.6 Direito Administrativo
- **Peças cobradas:** Mandado de Segurança (dominante), Apelação, Contestação, Petição Inicial (Ação Anulatória, Desapropriação Indireta), Recurso Ordinário
- **Temas recorrentes:** MS (cabimento, prazo, competência, liminar), processo administrativo, licitações, contratos, atos administrativos, responsabilidade civil do Estado, intervenção na propriedade
- **Chunks gerados:** 11
- **JSON:** `knowledge-base/content/topics/direito-administrativo.json`

### 2.7 Direito do Trabalho (pré-existente + suplementar)
- **Peças cobradas:** Recurso de Revista, Recurso Ordinário Trabalhista, Reclamação Trabalhista, Contestação, Recurso de Embargos, Mandado de Segurança Trabalhista, Dissídio Coletivo
- **Temas recorrentes:** CLT, rescisão, verbas rescisórias, FGTS, estabilidade, processo trabalhista, princípios
- **Chunks existentes:** 656 (material + processual + aulas)
- **JSON:** Já existentes nos 3 arquivos de DT

---

## 3. LIMPEZA E CURADORIA DE CONTEÚDO

### 3.1 Conteúdo removido / não incluído

Os seguintes elementos foram **excluídos** da base de conhecimento, conforme diretrizes de privacidade da plataforma:
- Nomes de professores e instrutores (referências como "Prof. X", "Profª. Y")
- Marcas de cursos preparatórios (referências a "Ceisc", "Damásio", "Estratégia", etc.)
- Textos de apresentação/marketing dos cursos ("Faaaala galera", saudações iniciais, motivacionais)
- Dicas operacionais de logística de prova (o que levar, horários, caderno de rascunho) — material não jurídico
- Promoções e chamadas para aulas complementares
- Redes sociais e handles de professores

### 3.2 Conteúdo mantido e curado
- Todo o conteúdo jurídico (artigos, conceitos, regras, princípios, jurisprudência, súmulas)
- Estruturas de peças processuais
- Histórico de provas e estatísticas FGV
- Erros comuns identificados nas questões
- Critérios de avaliação e rubricas

---

## 4. GAPS E LACUNAS IDENTIFICADAS

| Área | Lacuna | Prioridade | Sugestão |
|------|--------|------------|----------|
| Direito Civil | Espelhos de correção FGV para ações possessórias | Alta | Incluir rubrica de ação de reintegração de posse |
| Direito Civil | Questões discursivas reais com gabaritos | Alta | Extrair questões dos exames XXVI–46º |
| Direito Penal | Teoria da Pena detalhada (tópico mais cobrado — 81x) | Alta | Criar chunk específico com penas, cálculo trifásico, atenuantes/agravantes |
| Direito Constitucional | Direitos fundamentais Art. 5º (mais aplicado em peças) | Média | Chunk completo com incisos mais cobrados |
| Direito Tributário | Questões discursivas reais com gabarito | Alta | Extrair questões dos exames recentes |
| Direito Administrativo | Licitações Lei 14.133/21 detalhada | Média | Expandir chunk com modalidades, requisitos e prazos |
| Empresarial | Direito Falimentar (recuperação judicial/extrajudicial) | Alta | Criar chunks sobre Lei 11.101/05 |
| Todas as áreas | Espelhos de correção FGV para cada área | Alta | Criar arquivo `espelhos-[area].json` no mesmo formato do DT |

---

## 5. MAPA DA BASE DE CONHECIMENTO

```
knowledge-base/
├── ARCHITECTURE.md                    # Arquitetura técnica geral
├── AUDIT-REPORT.md                    # Auditoria v1 (Direito do Trabalho)
├── AUDIT-REPORT-V2.md                 # Este arquivo — auditoria completa
├── schema/
│   ├── supabase.sql                   # Schema PostgreSQL + pgvector
│   └── rag-embeddings.md              # Arquitetura RAG
└── content/
    ├── pieces/
    │   └── tabela-identificacao-pecas.json    # 36 tipos de peças
    ├── mirrors/
    │   └── espelhos-pecas-treino.json         # 20 espelhos FGV (DT)
    ├── questions/
    │   └── provas-anteriores.json             # 24 provas reais (DT)
    ├── legal-basis/
    │   └── sumulas-revogadas.json             # 34 provisões revogadas
    └── topics/
        ├── direito-material.json              # DT material — 214 chunks
        ├── direito-processual.json            # DT processual — 171 chunks
        ├── aulas-relevantes.json              # DT aulas — 271 chunks
        ├── direito-empresarial.json           # 🆕 13 chunks
        ├── direito-civil.json                 # 🆕 17 chunks
        ├── direito-penal.json                 # 🆕 12 chunks
        ├── direito-constitucional.json        # 🆕 10 chunks
        ├── direito-tributario.json            # 🆕 14 chunks
        └── direito-administrativo.json        # 🆕 11 chunks
```

**Total de chunks na base:** ~733 chunks jurídicos estruturados

---

## 6. MODELO DE DADOS — SCHEMA JSON POR CHUNK

```json
{
  "id": "area-NNN",
  "title": "Título descritivo do conceito",
  "area": "Direito X",
  "subject": "Subárea temática",
  "topic": "Tópico específico",
  "piece_type": ["tipo-de-peça-relacionada"],
  "content_type": "concept|rule|piece_structure|jurisprudence|statistics|checklist",
  "legal_basis": ["Art. X Lei Y", "Súmula Z STJ"],
  "evaluation_criteria": ["Critério FGV 1", "Critério FGV 2"],
  "common_errors": ["Erro frequente 1", "Erro frequente 2"],
  "content": "Texto jurídico completo e curado (sem nomes de professores/cursos)",
  "tags": ["tag1", "tag2"],
  "difficulty": "basic|intermediate|advanced",
  "oab_relevance": "high|medium|low"
}
```

---

## 7. INTEGRAÇÃO COM OS MÓDULOS LEXIUM

### 7.1 Correção Inteligente
- **Chunks utilizados:** `piece_structure` (estrutura da peça) + `rule` (fundamentos jurídicos) + `jurisprudence` (súmulas e precedentes)
- **Fluxo RAG:** pergunta do usuário → busca semântica nos chunks → injeção como contexto → modelo de correção gera feedback
- **Campo de recuperação:** `content`, `legal_basis`, `evaluation_criteria`

### 7.2 Diagnóstico de Desempenho
- **Chunks utilizados:** `statistics` (frequência de temas) + todos os chunks para mapear lacunas
- **Fluxo:** resultado das correções → comparação com `evaluation_criteria` → identificação de padrões de erro → diagnóstico por área/tópico

### 7.3 Simulados
- **Chunks utilizados:** `question` (questões discursivas) + `piece_structure` (enunciados de peças)
- **Campos-chave:** `difficulty`, `oab_relevance`, `topic`

### 7.4 Base de Estudos
- **Chunks utilizados:** todos os tipos
- **Fluxo:** busca semântica por palavra-chave ou conceito → recuperação dos chunks relevantes → apresentação organizada por `subject` e `topic`

### 7.5 Evolução
- **Chunks utilizados:** `statistics` para benchmarks + histórico de simulados do usuário
- **Fluxo:** rastreio de desempenho ao longo do tempo → comparação com médias de desempenho por área

---

## 8. RECOMENDAÇÕES RAG E EMBEDDING

### 8.1 Estratégia de Chunking
- Tamanho ideal: 300–800 tokens por chunk (já estruturado nos JSONs)
- Overlap sugerido: 50 tokens entre chunks do mesmo tópico
- Separar por `area` + `subject` para buscas filtradas

### 8.2 Embedding
- Modelo: `text-embedding-3-small` (OpenAI) — 1536 dimensões
- Índice: IVFFlat no pgvector do Supabase
- Parâmetros: `lists=100` para bases de até 1 milhão de vetores

### 8.3 Busca Híbrida Recomendada
```
busca_hibrida(query, area=null, difficulty=null):
  1. Embedding da query
  2. Filtro opcional por `area` e `difficulty` (pgvector WHERE clause)
  3. Busca semântica: top 5 chunks (cosine similarity > 0.75)
  4. Re-ranking: boost para chunks com `oab_relevance = "high"`
  5. Retorno: contexto injetado no prompt de correção/diagnóstico
```

---

## 9. SEGURANÇA E COMPLIANCE

### 9.1 Diretrizes de uso do conteúdo
- Os materiais são usados **exclusivamente como fonte de conteúdo jurídico e pedagógico**
- Nenhum nome de professor, curso ou instituição é exibido na plataforma
- Os materiais completos não são reproduzidos integralmente — apenas chunks curados
- A plataforma não reproduz materiais integrais de terceiros

### 9.2 LGPD
- Respostas dos usuários (peças redigidas) são processadas localmente e não enviadas a analytics
- Dados de desempenho são anonimizados antes de qualquer análise agregada
- Conteúdo jurídico sensível (caso do usuário) fica apenas no backend

---

## 10. PRÓXIMOS PASSOS (Backlog)

| Prioridade | Item | Esforço |
|------------|------|---------|
| 🔴 Alta | Criar espelhos de correção FGV para todas as 6 novas áreas | Grande |
| 🔴 Alta | Extrair questões discursivas reais dos exames recentes (38º–46º) para cada área | Grande |
| 🔴 Alta | Chunks detalhados de Teoria da Pena (cálculo trifásico, dosimetria) | Médio |
| 🔴 Alta | Chunks de Direito Falimentar (recuperação judicial — Lei 11.101/05) | Médio |
| 🟡 Média | Expandir Licitações com requisitos detalhados da Lei 14.133/21 | Médio |
| 🟡 Média | Adicionar questões e gabaritos de provas anteriores para cada área | Grande |
| 🟡 Média | Criar arquivo de mapeamento `areas-pecas-index.json` para lookup rápido | Pequeno |
| 🟢 Baixa | Chunks de Direito Internacional Privado e Estatuto da Advocacia (OAB) | Médio |
| 🟢 Baixa | Revisão e expansão dos chunks de Direito Constitucional (Art. 5º detalhado) | Médio |

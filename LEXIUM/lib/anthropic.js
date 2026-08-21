/**
 * LEXIUM — Cliente mínimo da API da Anthropic (Claude) para correção de peças
 *
 * Sem SDK — só `fetch` nativo, consistente com o resto do projeto. Troque
 * MODEL abaixo se quiser usar outro modelo da linha Claude.
 *
 * v1 propositalmente simples: não faz busca semântica (RAG) na base de
 * conhecimento antes de corrigir — usa só o enunciado + resposta do aluno e
 * o conhecimento jurídico geral do modelo. Ligar RAG (kb_chunks via
 * scripts/seed_knowledge_base.py + busca por embedding) é uma melhoria
 * natural de v2, não um bloqueio para começar a usar isso.
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

function buildPrompt({ tipo, tipoPeca, enunciado, textoAluno }) {
  const tipoLabel = tipo === 'questao_discursiva' ? 'Questão discursiva' : 'Peça processual';
  return `Você é um corretor experiente da 2ª fase do Exame de Ordem (OAB), seguindo o padrão de correção da banca FGV.

TIPO DE ATIVIDADE: ${tipoLabel}${tipoPeca ? ` (${tipoPeca})` : ''}

ENUNCIADO / CASO PRÁTICO:
"""
${enunciado}
"""

RESPOSTA DO ALUNO:
"""
${textoAluno}
"""

Corrija a resposta do aluno como a banca FGV faria: avalie estrutura formal, adequação da peça/resposta ao caso, fundamentação legal (cite os artigos/súmulas pertinentes), pedidos cabíveis, técnica processual e eventuais erros que zerariam a questão nas provas reais da FGV. Seja específico ao que o aluno de fato escreveu — não dê feedback genérico.

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{
  "pontuacao_total": <número de 0 a 10, até 2 casas decimais>,
  "nivel_geral": "<insuficiente|regular|bom|excelente>",
  "feedback_geral": "<parágrafo de feedback narrativo>",
  "pontos_fortes": ["<acerto específico>", "..."],
  "erros_criticos": ["<erro que compromete a nota, se houver>", "..."],
  "fundamentos_ausentes": ["<fundamento legal que faltou citar>", "..."],
  "itens_avaliados": [{"item": "<critério avaliado>", "status": "<atendido|parcial|nao_atendido>", "feedback": "<comentário breve>"}]
}`;
}

/**
 * Gera uma correção via Claude. Lança erro se ANTHROPIC_API_KEY não estiver
 * configurada, se a API falhar, ou se a resposta não for um JSON válido.
 */
export async function gerarCorrecaoIA({ tipo, tipoPeca, enunciado, textoAluno }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurado no servidor.');

  const resp = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        { role: 'user', content: buildPrompt({ tipo, tipoPeca, enunciado, textoAluno }) },
        { role: 'assistant', content: '{' }, // prefill — força a resposta a ser só o JSON, sem preâmbulo
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`API da Anthropic respondeu ${resp.status}: ${body.slice(0, 300)}`);
  }

  const data = await resp.json();
  const textoResposta = '{' + (data.content?.[0]?.text || '');

  let parsed;
  try {
    parsed = JSON.parse(textoResposta);
  } catch {
    throw new Error('A IA não retornou um JSON válido — tente novamente ou corrija manualmente.');
  }

  return {
    pontuacao_total: parsed.pontuacao_total ?? null,
    nivel_geral: parsed.nivel_geral ?? null,
    feedback_geral: parsed.feedback_geral ?? null,
    pontos_fortes: parsed.pontos_fortes ?? [],
    erros_criticos: parsed.erros_criticos ?? [],
    fundamentos_ausentes: parsed.fundamentos_ausentes ?? [],
    itens_avaliados: parsed.itens_avaliados ?? [],
    modelo_ia: MODEL,
    tokens_usados: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

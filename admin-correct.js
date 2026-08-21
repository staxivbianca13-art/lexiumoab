/**
 * LEXIUM — Salvar a correção de uma submissão (painel admin)
 * Rota: POST /api/admin-correct
 * Body: { submissao_id, pontuacao_total, nivel_geral, feedback_geral,
 *         pontos_fortes?, erros_criticos?, fundamentos_ausentes?,
 *         itens_avaliados?, modelo_ia? }
 *
 * Sempre salva o que vier no corpo — não importa se o admin escreveu tudo
 * do zero ou revisou/editou um rascunho gerado por IA (ver
 * api/admin-generate-ia.js, que só gera texto, nunca salva sozinho). Isso é
 * proposital: nenhuma correção chega no aluno sem passar por uma ação
 * explícita de "salvar" do admin.
 */
import { verifySession, parseCookies, SESSION_COOKIE_NAME } from '../lib/adminAuth.js';

async function supabaseRequest(path, options, supabaseUrl, serviceKey) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = verifySession(parseCookies(req)[SESSION_COOKIE_NAME]);
  if (!session) return res.status(401).json({ error: 'Sessão de admin inválida ou expirada.' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado no servidor.' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Requisição inválida.' });

  const {
    submissao_id, pontuacao_total, nivel_geral, feedback_geral,
    pontos_fortes, erros_criticos, fundamentos_ausentes, itens_avaliados, modelo_ia,
  } = body;

  if (!submissao_id) return res.status(400).json({ error: 'submissao_id é obrigatório.' });
  if (pontuacao_total == null || !nivel_geral || !feedback_geral) {
    return res.status(400).json({ error: 'Preencha ao menos nota, nível geral e feedback geral.' });
  }

  const correcaoPayload = {
    submissao_id,
    pontuacao_total,
    nivel_geral,
    feedback_geral,
    pontos_fortes: pontos_fortes || [],
    erros_criticos: erros_criticos || [],
    fundamentos_ausentes: fundamentos_ausentes || [],
    itens_avaliados: itens_avaliados || [],
    modelo_ia: modelo_ia || 'manual-humano',
  };

  try {
    const insertResp = await supabaseRequest(
      'correcoes?on_conflict=submissao_id',
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([correcaoPayload]),
      },
      SUPABASE_URL, SERVICE_ROLE_KEY
    );
    if (!insertResp.ok) {
      const errBody = await insertResp.text().catch(() => '');
      throw new Error(`Falha ao salvar correção (${insertResp.status}): ${errBody.slice(0, 300)}`);
    }

    await supabaseRequest(
      `submissoes?id=eq.${submissao_id}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'corrigido', processado_em: new Date().toISOString() }),
      },
      SUPABASE_URL, SERVICE_ROLE_KEY
    );

    const saved = await insertResp.json().catch(() => null);
    return res.status(200).json({ ok: true, correcao: Array.isArray(saved) ? saved[0] : saved });
  } catch (err) {
    console.error('[LEXIUM] Erro ao salvar correção:', err?.message);
    return res.status(500).json({ error: err.message || 'Não foi possível salvar a correção.' });
  }
}

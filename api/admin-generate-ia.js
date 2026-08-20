/**
 * LEXIUM — Gerar rascunho de correção com IA (painel admin)
 * Rota: POST /api/admin-generate-ia
 * Body: { submissao_id }
 *
 * Só GERA o texto via Claude e devolve pro painel — não grava nada no
 * banco. Fica a cargo do admin revisar/editar e clicar em salvar
 * (api/admin-correct.js), que é a única rota que efetivamente publica uma
 * correção pro aluno ver.
 */
import { verifySession, parseCookies, SESSION_COOKIE_NAME } from '../lib/adminAuth.js';
import { gerarCorrecaoIA } from '../lib/anthropic.js';

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
  const submissao_id = body && body.submissao_id;
  if (!submissao_id) return res.status(400).json({ error: 'submissao_id é obrigatório.' });

  try {
    const subResp = await fetch(`${SUPABASE_URL}/rest/v1/submissoes?id=eq.${submissao_id}&select=*`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    const submissoes = await subResp.json();
    const submissao = submissoes[0];
    if (!submissao) return res.status(404).json({ error: 'Submissão não encontrada.' });
    if (!submissao.enunciado) {
      return res.status(400).json({ error: 'Essa submissão não tem enunciado registrado — não é possível gerar correção.' });
    }

    const rascunho = await gerarCorrecaoIA({
      tipo: submissao.tipo,
      tipoPeca: submissao.tipo_peca,
      enunciado: submissao.enunciado,
      textoAluno: submissao.texto_aluno,
    });

    return res.status(200).json({ ok: true, rascunho });
  } catch (err) {
    console.error('[LEXIUM] Erro ao gerar rascunho com IA:', err?.message);
    return res.status(500).json({ error: err.message || 'Não foi possível gerar a correção com IA.' });
  }
}

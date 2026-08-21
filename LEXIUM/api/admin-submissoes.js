/**
 * LEXIUM — Lista de submissões (painel admin)
 * Rota: GET /api/admin-submissoes?status=pendente
 *
 * Protegido pela sessão de admin (cookie httpOnly assinado — ver
 * lib/adminAuth.js). Usa a service role key pra ler além do que a RLS
 * permitiria pra um usuário comum, já que o admin não é um "aluno".
 */
import { verifySession, parseCookies, SESSION_COOKIE_NAME } from '../lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = verifySession(parseCookies(req)[SESSION_COOKIE_NAME]);
  if (!session) return res.status(401).json({ error: 'Sessão de admin inválida ou expirada.' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado no servidor.' });
  }

  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const allowedStatus = ['pendente', 'processando', 'corrigido', 'erro'];
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  const select = encodeURIComponent(
    'id,tipo,tipo_peca,enunciado,texto_aluno,status,criado_em,processado_em,' +
    'alunos(nome,email),correcoes(id,pontuacao_total,nivel_geral,feedback_geral,modelo_ia,criado_em)'
  );
  let url = `${SUPABASE_URL}/rest/v1/submissoes?select=${select}&order=criado_em.desc&limit=100`;
  if (status) url += `&status=eq.${status}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Supabase respondeu ${resp.status}: ${body.slice(0, 300)}`);
    }
    const submissoes = await resp.json();
    return res.status(200).json({ submissoes });
  } catch (err) {
    console.error('[LEXIUM] Erro ao listar submissões:', err?.message);
    return res.status(500).json({ error: 'Não foi possível carregar as submissões.' });
  }
}

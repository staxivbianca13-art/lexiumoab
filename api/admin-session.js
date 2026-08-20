/**
 * LEXIUM — Verificação de sessão administrativa
 * Rota: GET /api/admin-session
 *
 * Usada por admin-dashboard.html para confirmar, no servidor, que o
 * cookie de sessão é válido antes de exibir dados administrativos.
 */
import { verifySession, parseCookies, SESSION_COOKIE_NAME } from '../lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cookies = parseCookies(req);
  const session = verifySession(cookies[SESSION_COOKIE_NAME]);

  if (!session) return res.status(401).json({ authenticated: false });

  return res.status(200).json({ authenticated: true, email: session.email });
}

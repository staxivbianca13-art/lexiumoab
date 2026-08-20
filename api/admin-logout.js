/**
 * LEXIUM — Logout administrativo
 * Rota: POST /api/admin-logout
 */
import { SESSION_COOKIE_NAME } from '../lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
  return res.status(200).json({ ok: true });
}

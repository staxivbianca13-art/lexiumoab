/**
 * LEXIUM — Login administrativo
 * Rota: POST /api/admin-login
 *
 * Valida e-mail/senha contra variáveis de ambiente (nunca hardcoded no
 * cliente) e devolve um cookie de sessão httpOnly em caso de sucesso.
 *
 * TODO produção: trocar comparação de senha em texto puro por hash
 * (ex: bcrypt) assim que o projeto tiver um gerenciador de pacotes (npm)
 * configurado — hoje não há package.json, então evitamos dependências novas.
 */
import { signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC, timingSafeStringEqual } from '../lib/adminAuth.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://lexium.com.br';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    console.error('[LEXIUM] ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_SESSION_SECRET não configurados.');
    return res.status(500).json({ error: 'Login administrativo não configurado no servidor.' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Requisição inválida.' });
  }

  // Honeypot — bots costumam preencher campos ocultos
  if (body.adm_hp) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';

  const emailOk = timingSafeStringEqual(email, ADMIN_EMAIL.toLowerCase());
  const senhaOk = timingSafeStringEqual(senha, ADMIN_PASSWORD);

  if (!emailOk || !senhaOk) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  const token = signSession(email);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}`
  );

  return res.status(200).json({ ok: true });
}

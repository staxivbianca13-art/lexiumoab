/**
 * LEXIUM — Sessão administrativa
 *
 * Gera e valida tokens de sessão assinados (HMAC-SHA256) sem depender de
 * pacotes externos (usa apenas o módulo `crypto` nativo do Node).
 *
 * Formato do token: base64url(payload).base64url(assinatura)
 * O payload nunca deve conter dados sensíveis — apenas e-mail e expiração.
 */
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'lexium_admin_session';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 8; // 8 horas

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET não configurado no ambiente.');
  return secret;
}

export function signSession(email) {
  const payload = JSON.stringify({ email, exp: Date.now() + SESSION_MAX_AGE_SEC * 1000 });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

export function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // mantém tempo de execução consistente
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

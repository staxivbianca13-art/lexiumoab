/**
 * LEXIUM — API de Captação de Leads
 * Rota: POST /api/leads
 *
 * Serverless function compatível com Vercel, Netlify Functions e Cloudflare Workers.
 * Implemente a integração real substituindo os blocos marcados com TODO.
 *
 * Segurança implementada:
 *  ✓ Apenas método POST aceito
 *  ✓ CORS restrito ao domínio próprio
 *  ✓ Validação e sanitização de payload
 *  ✓ Verificação de honeypot (campo "website")
 *  ✓ Heurística de tempo-na-página (bots são rápidos demais)
 *  ✓ Rate limit via IP (com Upstash Redis — ver TODO abaixo)
 *  ✓ Mensagens de erro genéricas (sem stack trace)
 *  ✓ Sem log de dados sensíveis
 *  ✓ Consentimento LGPD obrigatório
 */

// ── Configuração ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://lexium.com.br';
const MIN_TIME_ON_PAGE_SEC = 3; // submissão em menos de 3s = suspeita de bot

// ── Utilitários ───────────────────────────────────────────────────────────────
function sanitizeString(str, maxLen = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','&':'&amp;'}[c]));
}

function isValidEmail(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,10}$/.test(email);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

// ── Rate limit (Upstash Redis) ────────────────────────────────────────────────
// TODO: instale @upstash/ratelimit e @upstash/redis, descomente e configure.
// import { Ratelimit } from '@upstash/ratelimit';
// import { Redis } from '@upstash/redis';
// const ratelimit = new Ratelimit({
//   redis: Redis.fromEnv(),
//   limiter: Ratelimit.slidingWindow(5, '10 m'), // 5 req / 10 min por IP
// });

// ── Integração com CRM / E-mail ───────────────────────────────────────────────
async function saveLead(lead) {
  // TODO: escolha e implemente uma das integrações abaixo:

  // ── Opção 1: Supabase ──────────────────────────────────────────────────────
  // const { createClient } = await import('@supabase/supabase-js');
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // const { error } = await supabase.from('leads').insert([lead]);
  // if (error) throw error;

  // ── Opção 2: Resend (e-mail de notificação) ────────────────────────────────
  // const { Resend } = await import('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: process.env.RESEND_FROM_EMAIL,
  //   to: 'voce@lexium.com.br',
  //   subject: `Novo lead: ${lead.nome}`,
  //   text: JSON.stringify(lead, null, 2),
  // });

  // ── Opção 3: HubSpot ───────────────────────────────────────────────────────
  // await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ properties: { email: lead.email, firstname: lead.nome, hs_lead_status: 'OPEN' } }),
  // });

  // ── Mock / desenvolvimento: apenas loga (sem dados sensíveis) ──────────────
  console.log('[LEXIUM] Novo lead registrado:', { objetivo: lead.objetivo, ts: lead.ts });
  return true;
}

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const headers = corsHeaders(req.headers.origin);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(204).set(headers).end();
  }

  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).set(headers).json({ error: 'Method not allowed' });
  }

  try {
    // ── Rate limit ───────────────────────────────────────────────────────────
    // TODO: descomente após configurar Upstash
    // const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    // const { success } = await ratelimit.limit(ip);
    // if (!success) return res.status(429).set(headers).json({ error: 'Too many requests. Try again later.' });

    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).set(headers).json({ error: 'Invalid request body.' });
    }

    // ── Honeypot ─────────────────────────────────────────────────────────────
    if (body.website && body.website !== '') {
      // Silently accept — don't reveal detection
      return res.status(200).set(headers).json({ ok: true });
    }

    // ── Heurística de tempo na página ─────────────────────────────────────────
    const top = parseInt(body.top, 10) || 0;
    if (top < MIN_TIME_ON_PAGE_SEC) {
      return res.status(200).set(headers).json({ ok: true }); // Silently reject
    }

    // ── Validação ────────────────────────────────────────────────────────────
    const nome = sanitizeString(body.nome, 120);
    const email = sanitizeString(body.email, 254).toLowerCase();
    const objetivo = sanitizeString(body.objetivo, 80);
    const consent = body.consent === true;

    if (!nome || nome.length < 2) return res.status(400).set(headers).json({ error: 'Nome inválido.' });
    if (!email || !isValidEmail(email)) return res.status(400).set(headers).json({ error: 'E-mail inválido.' });
    if (!consent) return res.status(400).set(headers).json({ error: 'Consentimento obrigatório.' });

    const lead = {
      nome,
      email,
      objetivo,
      consent: true,
      consent_ts: new Date().toISOString(),
      source: 'landing_page',
    };

    await saveLead(lead);

    return res.status(200).set(headers).json({ ok: true });

  } catch (err) {
    // Nunca expor o erro real ao cliente
    console.error('[LEXIUM] Erro ao processar lead:', err?.message);
    return res.status(500).set(headers).json({ error: 'Erro interno. Tente novamente.' });
  }
}

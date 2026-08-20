/**
 * LEXIUM — Webhook do Mercado Pago
 * Rota: POST /api/mp-webhook
 *
 * Confirma o pagamento (nunca confia no corpo da notificação sozinho —
 * sempre rebusca o pagamento na API do Mercado Pago pelo ID) e, se
 * aprovado, convida o aluno por e-mail via Supabase Auth Admin API.
 * O e-mail de convite do Supabase leva a um link seguro pra o aluno
 * definir a própria senha — nunca geramos nem enviamos senha em texto
 * puro.
 *
 * Configure esta URL (https://SEU_DOMINIO/api/mp-webhook) no painel do
 * Mercado Pago em Webhooks, evento "payment".
 */
import { getPayment, verifyWebhookSignature } from '../lib/mercadoPago.js';

async function inviteAluno({ email, nome, plano }) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados.');
  }

  // ⚠️ Equivalente ao supabase-js `auth.admin.inviteUserByEmail()`, chamado
  // direto via REST pra não precisar da dependência supabase-js aqui.
  // Confirme esse endpoint contra a documentação atual do Supabase Auth
  // (GoTrue) ao testar com um projeto real — APIs administrativas mudam
  // com mais frequência que as públicas.
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, data: { nome, plano } }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Falha ao convidar aluno (${resp.status}): ${body.slice(0, 300)}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const dataId = req.query['data.id'] || req.query.id || (req.body && req.body.data && req.body.data.id);
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];

  const signatureOk = verifyWebhookSignature({ xSignature, xRequestId, dataId });
  if (!signatureOk) {
    console.error('[LEXIUM] Webhook Mercado Pago com assinatura inválida.');
    return res.status(401).json({ error: 'Assinatura inválida.' });
  }

  try {
    const payment = await getPayment(dataId);

    if (payment.status !== 'approved') {
      // Pendente, rejeitado etc. — só confirmamos acesso em pagamento aprovado.
      return res.status(200).json({ ok: true, status: payment.status });
    }

    let pedido;
    try {
      pedido = JSON.parse(payment.external_reference || '{}');
    } catch {
      console.error('[LEXIUM] external_reference inválido no pagamento', dataId);
      return res.status(200).json({ ok: true, warning: 'external_reference inválido' });
    }

    if (!pedido.email || !pedido.plano) {
      console.error('[LEXIUM] Pagamento aprovado sem dados de pedido associados', dataId);
      return res.status(200).json({ ok: true, warning: 'pedido incompleto' });
    }

    await inviteAluno({ email: pedido.email, nome: pedido.nome, plano: pedido.plano });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[LEXIUM] Erro ao processar webhook Mercado Pago:', err?.message);
    // 200 mesmo em erro interno evita retries agressivos do MP por algo
    // que não é culpa da notificação em si; o erro já foi logado.
    return res.status(200).json({ ok: false });
  }
}

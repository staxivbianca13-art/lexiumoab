/**
 * LEXIUM — Integração Mercado Pago (Pix, boleto à vista, cartão)
 *
 * Sem dependências novas — usa `fetch` nativo do runtime Node da Vercel.
 * Referência: https://www.mercadopago.com.br/developers/pt/reference
 */
import crypto from 'crypto';

const MP_API_BASE = 'https://api.mercadopago.com';

/**
 * Cria uma preferência de pagamento (Checkout Pro) e retorna a URL de
 * redirecionamento (`init_point`) para o cliente escolher Pix, boleto
 * ou cartão na página hospedada do Mercado Pago.
 */
export async function createPreference({ title, unitPrice, externalReference, payerEmail, backUrls, notificationUrl }) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado.');

  const resp = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        title,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: unitPrice,
      }],
      payer: payerEmail ? { email: payerEmail } : undefined,
      external_reference: externalReference,
      back_urls: backUrls,
      auto_return: 'approved',
      notification_url: notificationUrl,
      payment_methods: {
        // Aceita Pix, boleto à vista e cartão de crédito — exclui parcelamento
        // acima de 1x pra manter o fluxo "à vista" pedido pelo produto.
        installments: 1,
        default_installments: 1,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Falha ao criar preferência Mercado Pago (${resp.status}): ${body.slice(0, 300)}`);
  }

  return resp.json(); // contém .id e .init_point
}

/** Busca os detalhes completos de um pagamento pelo ID (nunca confiar só no payload do webhook). */
export async function getPayment(paymentId) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado.');

  const resp = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Falha ao buscar pagamento ${paymentId} (${resp.status})`);
  return resp.json();
}

/**
 * Valida a assinatura do webhook (header `x-signature`), conforme:
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks#editor_2
 *
 * ⚠️ O formato exato do manifest pode mudar — confirme contra a documentação
 * atual do Mercado Pago ao ativar isso com uma conta real, antes de confiar
 * cegamente neste código em produção.
 */
export function verifyWebhookSignature({ xSignature, xRequestId, dataId }) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map(p => p.trim().split('=').map(s => s.trim()))
  );
  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  const receivedBuf = Buffer.from(receivedHash);
  const expectedBuf = Buffer.from(expectedHash);
  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

/**
 * LEXIUM — Criação de checkout (Mercado Pago)
 * Rota: POST /api/create-checkout
 *
 * Recebe { nome, email, plano }, cria uma preferência de pagamento e
 * devolve a URL do Checkout Pro para o cliente escolher Pix, boleto à
 * vista ou cartão. O acesso à plataforma só é liberado depois que o
 * webhook (api/mp-webhook.js) confirmar o pagamento — ver ali.
 *
 * Preços definidos em 2026-07: mensal recorrente, premium como ciclo
 * único até a próxima prova, simulados como compra avulsa por unidade
 * (de propósito mais caro por unidade que o efetivo do plano mensal,
 * pra não incentivar quem usa com regularidade a ficar só no avulso —
 * ver index.html#planos pra o texto voltado ao aluno).
 */
import { createPreference } from '../lib/mercadoPago.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://lexium.com.br';

const PLANOS = {
  mensal:    { nome: 'Plano Mensal — LEXIUM',   valor: 69.90 },
  premium:   { nome: 'Plano Premium — LEXIUM',  valor: 239.90 },
  simulados: { nome: 'Simulado Avulso — LEXIUM', valor: 37.90 },
};

function isValidEmail(email) {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,10}$/.test(email);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Requisição inválida.' });
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim().slice(0, 120) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const planoId = typeof body.plano === 'string' ? body.plano : '';

  if (!nome || nome.length < 2) return res.status(400).json({ error: 'Informe seu nome completo.' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });

  const plano = PLANOS[planoId];
  if (!plano) return res.status(400).json({ error: 'Plano inválido.' });
  if (plano.valor === null) {
    return res.status(500).json({ error: 'Este plano ainda não está disponível para compra.' });
  }

  try {
    // external_reference carrega o que o webhook precisa pra criar o
    // convite de acesso depois de confirmado o pagamento.
    const externalReference = JSON.stringify({ nome, email, plano: planoId });

    const preference = await createPreference({
      title: plano.nome,
      unitPrice: plano.valor,
      externalReference,
      payerEmail: email,
      backUrls: {
        success: `${ALLOWED_ORIGIN}/index.html?checkout=sucesso`,
        pending: `${ALLOWED_ORIGIN}/index.html?checkout=pendente`,
        failure: `${ALLOWED_ORIGIN}/index.html?checkout=falha`,
      },
      notificationUrl: `${ALLOWED_ORIGIN}/api/mp-webhook`,
    });

    return res.status(200).json({ checkoutUrl: preference.init_point });
  } catch (err) {
    console.error('[LEXIUM] Erro ao criar checkout:', err?.message);
    return res.status(500).json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' });
  }
}

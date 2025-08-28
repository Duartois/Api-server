import express from 'express';
import Stripe from 'stripe';
import { sendOrderDetailsViaEmail } from '../services/emailService.js';

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_KEY);
const DOMAIN = process.env.DOMAIN;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function fetchLineItems(sessionId) {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
  return lineItems.data;
}

router.post('/stripe-checkout', async (req, res) => {
  try {
    const { items, address, email } = req.body;
    console.log('Dados recebidos:', { items, address, email });

    if (!items || !Array.isArray(items)) {
      throw new Error('Itens inválidos recebidos.');
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: item.price_data.product_data.name,
          images: item.price_data.product_data.images || [],
        },
        unit_amount: item.price_data.unit_amount,
      },
      quantity: item.quantity,
    }));

    console.log('Line items preparados:', lineItems);
    console.log('Line items preparados:', JSON.stringify(lineItems, null, 2));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      customer_email: email,
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/checkout`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error.message);
    res.status(500).json({ error: "Falha ao criar sessão de checkout", message: error.message });
  }
});

router.post('/stripe-webhook', async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    console.log('[WEBHOOK] Evento recebido:', event.type);
  } catch (err) {
    console.error('[WEBHOOK] Erro ao validar evento:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const orderDetails = {
      id: session.id,
      items: await fetchLineItems(session.id),
      total: (session.amount_total / 100).toFixed(2),
      address: session.shipping?.address?.line1 || 'Endereço não informado',
      customerName: session.customer_details.name || 'Nome não informado',
    };

    console.log('[WEBHOOK] Pedido recebido:', orderDetails);

    await sendOrderDetailsViaEmail(orderDetails);
  }

  response.status(200).send('[WEBHOOK] Evento processado com sucesso.');
});

export default router;

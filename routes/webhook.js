import express from "express";
import Stripe from "stripe";
import Order from "../models/order.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe precisa do rawBody para verificar a assinatura
router.post(
  "/stripe-webhook",
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      try {
        // Itens comprados
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

        await Order.create({
          email: session.metadata.email,
          sellerId: session.metadata.sellerId,
          address: JSON.parse(session.metadata.address || "{}"),
          products: lineItems.data.map((item) => ({
            name: item.description,
            quantity: item.quantity,
            price: item.amount_total / 100,
          })),
          total: session.amount_total / 100,
          status: session.payment_status,
          stripeSessionId: session.id,
        });

        console.log("✅ Pedido salvo no banco");
      } catch (err) {
        console.error("Erro ao salvar pedido:", err);
      }
    }

    res.json({ received: true });
  }
);

export default router;

import express from "express";
import Stripe from "stripe";
import connectMongo from "../services/mongo.js";
import Order from "../models/Order.js";
import getRawBody from "raw-body";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/stripe-webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const buf = await getRawBody(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      await connectMongo();

      let products = [];
      if (session.metadata.products) {
        products = JSON.parse(session.metadata.products);
      } else {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        products = lineItems.data.map((item) => ({
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.price.unit_amount / 100,
          subtotal: (item.price.unit_amount / 100) * item.quantity,
        }));
      }

      await Order.create({
        email: session.metadata.email,
        adminId: session.metadata.adminId,
        address: JSON.parse(session.metadata.address || "{}"),
        products,
        total: session.amount_total / 100,
        status: session.payment_status,
        stripeSessionId: session.id,
        testMode: !session.livemode,
      });

      console.log("✅ Pedido salvo no MongoDB");
    } catch (err) {
      console.error("Erro ao salvar pedido no Mongo:", err);
    }
  }

  res.json({ received: true });
});

export default router;


import express from "express";
import Stripe from "stripe";
import connectMongo from "../services/mongo.js";
import Order from "../models/Order.js";
import getRawBody from "raw-body";
import mongoose from "mongoose";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/stripe-webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log("✅ Evento recebido:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("📦 Session completa:", session.id, session.metadata);
    let products = [];
    try {
      products = JSON.parse(session.metadata?.products || "[]");
    } catch (err) {
      console.error(
        "❌ Erro ao parsear produtos do metadata:",
        err,
        session.metadata?.products
      );
      products = [];
    }

    if (products.length === 0) {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id
        );
        products = lineItems.data.map((item) => ({
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.price?.unit_amount
            ? item.price.unit_amount / 100
            : 0,
          subtotal: item.amount_total ? item.amount_total / 100 : 0,
        }));
      } catch (err) {
        console.error(
          "❌ Erro ao recuperar itens diretamente do Stripe:",
          err
        );
      }
    }

    try {
      await connectMongo();

      console.log("📡 DB conectado:", mongoose.connection.name);
      console.log("📦 Salvando pedido:", {
        email: session.metadata.email,
        products,
      });

      const order = await Order.create({
        email: session.metadata.email,
        adminId: session.metadata.adminId,
        address: session.customer_details?.address || {},
        products,
        total: session.amount_total / 100,
        status: session.payment_status,
        stripeSessionId: session.id,
        testMode: !session.livemode,
      });

      console.log("✅ Pedido salvo:", order._id);
    } catch (err) {
      console.error("❌ Erro ao salvar pedido no Mongo:", err);
    }
  }

  // 🔴 importante: só responder depois do processamento
  res.json({ received: true });
});

export default router;

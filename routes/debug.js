import express from "express";
import connectMongo from "../services/mongo.js";
import Order from "../models/Order.js";

const router = express.Router();

router.post("/debug-fake-order", async (req, res) => {
  try {
    await connectMongo();

    const fakeOrder = await Order.create({
      email: "teste@bichinhos.com",
      adminId: "debug",
      address: { city: "São Paulo", country: "BR" },
      products: [
        { name: "Amigurumi Fake", quantity: 1, unitPrice: 99.9, subtotal: 99.9 },
      ],
      total: 99.9,
      status: "paid",
      stripeSessionId: "fake_session_id",
      testMode: true,
    });

    console.log("✅ Pedido fake salvo:", fakeOrder._id);
    res.json({ success: true, order: fakeOrder });
  } catch (err) {
    console.error("❌ Erro ao salvar pedido fake:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

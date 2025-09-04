import express from "express";
import Order from "../models/order.js";

const router = express.Router();

// Listar pedidos por vendedor ou por e-mail
router.post("/get-orders", async (req, res) => {
  try {
    const { email, sellerId } = req.body;
    const filter = {};

    if (email) filter.email = email;
    if (sellerId) filter.sellerId = sellerId;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});

export default router;

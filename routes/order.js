import express from "express";
import connectMongo from "../services/mongo.js";
import Order from "../models/Order.js";

const router = express.Router();

router.post("/get-orders", async (req, res) => {
  try {
    await connectMongo();
    const { email, adminId } = req.body;

    const filter = adminId ? { adminId } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(20);

    res.json(orders);
  } catch (err) {
    console.error("Erro ao buscar pedidos (Mongo):", err);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});

export default router;

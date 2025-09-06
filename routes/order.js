import express from "express";
import connectMongo from "../services/mongo.js";
import Order from "../models/Order.js";

const router = express.Router();

router.post("/get-orders", async (req, res) => {
  try {
    await connectMongo();
    const { email, adminId } = req.body;

    const filter = {};
if (adminId) filter.adminId = adminId;
if (email) filter.email = email;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(20);

    res.json(orders);
  } catch (err) {
    console.error("Erro ao buscar pedidos (Mongo):", err);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});
// order.js
router.delete("/delete-order/:id", async (req, res) => {
  try {
    await connectMongo();
    const { id } = req.params;

    const deleted = await Order.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    res.json({ success: true, message: "Pedido removido com sucesso" });
  } catch (err) {
    console.error("Erro ao remover pedido:", err);
    res.status(500).json({ error: "Erro ao remover pedido" });
  }
});

export default router;

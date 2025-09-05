import express from "express";
import { db } from "../services/firebase.js";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

const router = express.Router();

router.post("/get-orders", async (req, res) => {
  try {
    const { email, adminId } = req.body;

    let q = collection(db, "orders");

    if (email) {
      q = query(q, where("email", "==", email), orderBy("createdAt", "desc"));
    } else if (adminId) {
      q = query(q, where("adminId", "==", adminId), orderBy("createdAt", "desc"), limit(20));
    }

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json(orders);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});

export default router;


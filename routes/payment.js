import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_KEY);

router.post("/stripe-checkout", async (req, res) => {
  try {
    const { items, email, address, sellerId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        email,
        sellerId: sellerId || "default",
        address: JSON.stringify(address || {}),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
  console.error("Erro Stripe Checkout:", err.message, err.stack);
  res.status(500).json({ error: err.message });
}
});

export default router;

import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("Stripe key loaded?", process.env.STRIPE_SECRET_KEY ? "YES" : "NO");

router.post("/stripe-checkout", async (req, res) => {
  try {
    const { items, email, adminId } = req.body;

    const products = (items || []).map((item) => {
      const unitAmount = item?.price_data?.unit_amount || 0;
      const quantity = item?.quantity || 0;
      const name =
        item?.price_data?.product_data?.name || item?.description || "";

      return {
        name,
        quantity,
        unitPrice: unitAmount / 100,
        subtotal: (unitAmount * quantity) / 100,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        email,
        adminId: adminId || "default",
        products: JSON.stringify(products),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erro Stripe Checkout:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;

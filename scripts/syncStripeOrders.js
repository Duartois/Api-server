import Stripe from "stripe";
import "dotenv/config";
import connectMongo from "../services/mongo.js";
import Order from "../models/Order.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PAGE_LIMIT = 100;

async function syncStripeOrders() {
  try {
    await connectMongo();

    let startingAfter;
    let hasMore = true;
    let processed = 0;

    while (hasMore) {
      const params = {
        limit: PAGE_LIMIT,
        expand: ["data.line_items"],
      };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const sessions = await stripe.checkout.sessions.list(params);

      for (const session of sessions.data) {
        const products = (session.line_items?.data || []).map((item) => ({
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.price?.unit_amount
            ? item.price.unit_amount / 100
            : 0,
          subtotal: item.amount_total ? item.amount_total / 100 : 0,
        }));

        const orderData = {
          email: session.customer_details?.email || session.metadata?.email,
          adminId: session.metadata?.adminId,
          address: session.customer_details?.address || {},
          products,
          total: session.amount_total / 100,
          status: session.payment_status,
          stripeSessionId: session.id,
          testMode: !session.livemode,
        };

        await Order.findOneAndUpdate(
          { stripeSessionId: session.id },
          orderData,
          { upsert: true, new: true }
        );
      }

      processed += sessions.data.length;
      console.log(`Processed ${processed} sessions`);

      if (sessions.has_more) {
        startingAfter = sessions.data[sessions.data.length - 1].id;
      }
      hasMore = sessions.has_more;
    }

    console.log("Sync completed");
    process.exit(0);
  } catch (err) {
    console.error("Failed to sync orders:", err);
    process.exit(1);
  }
}

syncStripeOrders();

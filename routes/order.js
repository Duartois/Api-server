import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  email: { type: String, required: true },
  sellerId: { type: String, default: "default" },
  address: { type: Object, default: {} },
  products: [
    {
      name: String,
      quantity: Number,
      price: Number,
    },
  ],
  total: Number,
  status: String,
  stripeSessionId: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);

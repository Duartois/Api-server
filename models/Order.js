import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  email: String,
  adminId: String,
  address: Object,
  products: [
    { name: String, quantity: Number, unitPrice: Number, subtotal: Number }
  ],
  total: Number,
  status: String,
  stripeSessionId: String,
  testMode: Boolean,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // Filled in after payment succeeds (Stripe collects the address at checkout),
  // so these are NOT required when the pending order is first created.
  deliveryInfo: {
    address: { type: String },
    city: { type: String },
    phoneNo: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  orderItems: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      fooditem: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "FoodItem",
      },
    },
  ],
  paymentInfo: {
    id: { type: String },
    // unpaid -> fulfilling -> paid (or refunded if stock ran out after payment)
    status: {
      type: String,
      enum: ["unpaid", "fulfilling", "paid", "refunded"],
      default: "unpaid",
    },
  },
  // Links the order to its Stripe Checkout session; unique so one session can
  // never create two orders.
  stripeSessionId: { type: String, unique: true, sparse: true },
  paidAt: { type: Date },

  itemsPrice: { type: Number, required: true, default: 0.0 },
  taxPrice: { type: Number, default: 0.0 },
  deliveryCharge: { type: Number, default: 0.0 },
  finalTotal: { type: Number, required: true, default: 0.0 },

  orderStatus: {
    type: String,
    required: true,
    enum: [
      "Processing",
      "Preparing",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ],
    default: "Processing",
  },
  deliveredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.index({ user: 1, createdAt: -1 });

// NOTE: stock is no longer decremented in a pre("save") hook. That approach was
// not atomic (two simultaneous orders could oversell) and it ran after the
// customer had already paid. Stock is now reserved atomically in
// services/orderService.js -> fulfillCheckoutSession().

module.exports = mongoose.model("Order", orderSchema);

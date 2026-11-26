const Order = require("../models/order");
const Cart = require("../models/cartModel");
const FoodItem = require("../models/foodItem");
const getStripe = require("../config/stripe");
const ErrorHandler = require("../utils/errorHandler");

const DELIVERY_CHARGE = 55; // INR
const FALLBACK_IMAGE = "/images/logo.webp";
const UNPAID_ORDER_TTL_MS = 24 * 60 * 60 * 1000; // Stripe sessions expire in 24h

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Build a PENDING order from the logged-in user's cart.
 * Every price comes from the database, never from the request body, so a
 * client cannot change what they pay.
 */
exports.createPendingOrderFromCart = async (user) => {
  // housekeeping: drop abandoned checkouts older than a day
  await Order.deleteMany({
    user: user._id,
    "paymentInfo.status": "unpaid",
    createdAt: { $lt: new Date(Date.now() - UNPAID_ORDER_TTL_MS) },
  });

  const cart = await Cart.findOne({ user: user._id }).populate("items.foodItem");

  if (!cart || cart.items.length === 0) {
    throw new ErrorHandler("Your cart is empty", 400);
  }

  const orderItems = [];

  for (const item of cart.items) {
    const food = item.foodItem;

    if (!food) {
      throw new ErrorHandler(
        "An item in your cart is no longer available. Please refresh your cart.",
        400
      );
    }

    // early, friendly stock check (the authoritative atomic check happens
    // after payment in fulfillCheckoutSession)
    if (food.stock < item.quantity) {
      throw new ErrorHandler(
        `Only ${food.stock} of '${food.name}' left in stock`,
        400
      );
    }

    orderItems.push({
      name: food.name,
      quantity: item.quantity,
      image: (food.images && food.images[0] && food.images[0].url) || FALLBACK_IMAGE,
      price: food.price,
      fooditem: food._id,
    });
  }

  const itemsPrice = round2(
    orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  return Order.create({
    user: user._id,
    restaurant: cart.restaurant,
    orderItems,
    itemsPrice,
    deliveryCharge: DELIVERY_CHARGE,
    finalTotal: round2(itemsPrice + DELIVERY_CHARGE),
  });
};

/**
 * Turn a PAID Stripe Checkout session into a confirmed order.
 *
 * Idempotent: it is called both by the Stripe webhook and by the success page,
 * possibly at the same time, and only the first caller does the work.
 * Returns the order, or null if the session has not been paid.
 */
exports.fulfillCheckoutSession = async (session) => {
  const orderId = session.metadata && session.metadata.orderId;

  if (!orderId) {
    throw new ErrorHandler("This payment session is not linked to an order", 400);
  }

  if (session.payment_status !== "paid") {
    return null;
  }

  // Atomically claim the order. Only one caller can flip unpaid -> fulfilling.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, "paymentInfo.status": "unpaid" },
    { $set: { "paymentInfo.status": "fulfilling" } },
    { new: true }
  );

  if (!order) {
    // already fulfilled (or being fulfilled) by another caller
    return Order.findById(orderId);
  }

  if (session.amount_total !== Math.round(order.finalTotal * 100)) {
    console.warn(
      `Order ${order._id}: Stripe charged ${session.amount_total} paise but order total is ${order.finalTotal}`
    );
  }

  // Reserve stock atomically: the update only matches if enough stock remains.
  const reserved = [];
  try {
    for (const item of order.orderItems) {
      const updated = await FoodItem.findOneAndUpdate(
        { _id: item.fooditem, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );

      if (!updated) {
        throw new Error(`Insufficient stock for '${item.name}'`);
      }
      reserved.push(item);
    }
  } catch (err) {
    // Put back whatever we already took, refund the customer, cancel the order.
    await Promise.all(
      reserved.map((i) =>
        FoodItem.updateOne({ _id: i.fooditem }, { $inc: { stock: i.quantity } })
      )
    );

    let refunded = false;
    try {
      await getStripe().refunds.create({ payment_intent: session.payment_intent });
      refunded = true;
    } catch (refundErr) {
      console.error(`Refund failed for order ${order._id}:`, refundErr.message);
    }

    order.paymentInfo = {
      id: session.payment_intent,
      // "paid" + "Cancelled" = needs a manual refund from the Stripe dashboard
      status: refunded ? "refunded" : "paid",
    };
    order.orderStatus = "Cancelled";
    await order.save();
    return order;
  }

  // newer Stripe API versions moved the shipping address to collected_information
  const address =
    (session.collected_information &&
      session.collected_information.shipping_details &&
      session.collected_information.shipping_details.address) ||
    (session.shipping_details && session.shipping_details.address) ||
    (session.customer_details && session.customer_details.address) ||
    {};

  order.deliveryInfo = {
    address: [address.line1, address.line2].filter(Boolean).join(", "),
    city: address.city,
    phoneNo: session.customer_details && session.customer_details.phone,
    postalCode: address.postal_code,
    country: address.country,
  };
  order.paymentInfo = { id: session.payment_intent, status: "paid" };
  order.paidAt = Date.now();
  await order.save();

  await Cart.findOneAndDelete({ user: order.user });

  return order;
};

exports.DELIVERY_CHARGE = DELIVERY_CHARGE;

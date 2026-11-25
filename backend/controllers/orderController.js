const Order = require("../models/order");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const getStripe = require("../config/stripe");
const { fulfillCheckoutSession } = require("../services/orderService");

// Confirm an order after Stripe redirects back  =>  POST /api/v1/eats/orders/new
// The Stripe webhook normally does this first; this is a safe, idempotent fallback
// so the success page works even if the webhook is delayed.
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  const { session_id } = req.body;

  if (!session_id || typeof session_id !== "string") {
    return next(new ErrorHandler("session_id is required", 400));
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(session_id);
  } catch (err) {
    return next(new ErrorHandler("Invalid payment session", 400));
  }

  // a user may only confirm their own checkout session
  if (!session.metadata || session.metadata.userId !== req.user.id) {
    return next(
      new ErrorHandler("This payment session does not belong to you", 403)
    );
  }

  const order = await fulfillCheckoutSession(session);

  if (!order) {
    return next(new ErrorHandler("Payment has not been completed yet", 402));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// Get single order   =>   /api/v1/eats/orders/:id
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("restaurant");

  // owners and admins only; 404 (not 403) so order IDs can't be probed
  if (
    !order ||
    (order.user._id.toString() !== req.user.id && req.user.role !== "admin")
  ) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// Get logged in user's orders   =>   /api/v1/eats/orders/me/myOrders
exports.myOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({
    user: req.user._id,
    "paymentInfo.status": { $in: ["paid", "refunded"] }, // hide unpaid checkouts
  })
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate("restaurant");

  res.status(200).json({
    success: true,
    orders,
  });
});

// Get all orders - ADMIN
exports.allOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ "paymentInfo.status": "paid" });

  let totalAmount = 0;
  orders.forEach((order) => {
    totalAmount += order.finalTotal;
  });

  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});

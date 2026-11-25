const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const getStripe = require("../config/stripe");
const Order = require("../models/order");
const {
  createPendingOrderFromCart,
  DELIVERY_CHARGE,
} = require("../services/orderService");

// POST /api/v1/payment/process
// The request body is ignored on purpose: items and prices are read from the
// user's cart and the FoodItem collection on the server.
exports.processPayment = catchAsyncErrors(async (req, res, next) => {
  const stripe = getStripe();

  const order = await createPendingOrderFromCart(req.user);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      client_reference_id: order._id.toString(),
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
      },
      phone_number_collection: { enabled: true },
      line_items: order.orderItems.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
            // Stripe only accepts absolute URLs for images
            ...(item.image.startsWith("http") ? { images: [item.image] } : {}),
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["US", "IN"] },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Delivery Charges",
            type: "fixed_amount",
            fixed_amount: {
              amount: DELIVERY_CHARGE * 100, // paise
              currency: "inr",
            },
            delivery_estimate: {
              minimum: { unit: "hour", value: 1 },
              maximum: { unit: "hour", value: 3 },
            },
          },
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
    });
  } catch (err) {
    await Order.findByIdAndDelete(order._id);
    throw err;
  }

  order.stripeSessionId = session.id;
  await order.save();

  res.status(200).json({ url: session.url });
});

// Send stripe publishable key   =>   /api/v1/stripeapi
exports.sendStripApi = catchAsyncErrors(async (req, res, next) => {
  res.status(200).json({
    stripeApiKey: process.env.STRIPE_API_KEY,
  });
});

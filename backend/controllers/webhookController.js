const getStripe = require("../config/stripe");
const { fulfillCheckoutSession } = require("../services/orderService");

// POST /api/v1/stripe/webhook
// Must receive the RAW request body (see app.js) so the signature can be verified.
exports.stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillCheckoutSession(event.data.object);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handling failed:", err);
    // non-2xx makes Stripe retry later
    res.status(500).json({ received: false });
  }
};

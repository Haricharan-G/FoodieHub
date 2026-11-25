// Lazily create the Stripe client so it works regardless of when dotenv loads.
let client;

module.exports = () => {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is missing from config/config.env");
    }
    client = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
  return client;
};

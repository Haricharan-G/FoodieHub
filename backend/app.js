const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const errorMiddleware = require("./middlewares/errors");
const { stripeWebhook } = require("./controllers/webhookController");

const app = express();

// needed on Render/Railway/Heroku so rate limiting sees the real client IP
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Read lazily: dotenv is loaded in server.js AFTER this file is required.
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      // no Origin header = same-origin / server-to-server / Postman
      callback(null, !origin || origin === allowed);
    },
    credentials: true,
  }),
);

// Stripe webhook needs the RAW body to verify the signature, so it must be
// registered BEFORE express.json().
app.post(
  "/api/v1/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// 2mb: avatars are sent as base64 strings inside the JSON body
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(fileUpload({ limits: { fileSize: 2 * 1024 * 1024 } }));

// Rate limiting
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/signup", authLimiter);
app.use("/api/v1/users/forgetPassword", authLimiter);

//Import all routes
const foodRouter = require("./routes/foodItem");
const restaurant = require("./routes/restaurant");
const menuRouter = require("./routes/menu");
const coupon = require("./routes/couponRoutes");
const order = require("./routes/order");
const auth = require("./routes/auth");
const payment = require("./routes/payment");
const cart = require("./routes/cart");
const aiRoutes = require("./routes/ai.routes");

app.use("/api/v1/eats", foodRouter);
app.use("/api/v1/eats/menus", menuRouter);
app.use("/api/v1/eats/stores", restaurant);
app.use("/api/v1/eats/orders", order);
app.use("/api/v1/users", auth);
app.use("/api/v1", payment);
app.use("/api/v1/coupon", coupon);
app.use("/api/v1/eats/cart", cart);
app.use("/api/v1/ai", aiRoutes);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "view"));

app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server !`,
  });
});

app.use(errorMiddleware);

module.exports = app;

# FoodieHub

A full-stack food ordering web application built with the **MERN stack**. Customers can discover restaurants, browse menus, manage a cart and pay online with **Stripe**. Admins manage restaurants, menus and food items.

<!-- Live demo: add your deployed link here once the app is deployed -->

<!-- Screenshots: add images to docs/screenshots/ and link them here, e.g.
![Home](docs/screenshots/home.png)
-->

## Features

**Customers**
- Browse, search and filter restaurants (pure veg), sort by reviews or ratings
- View restaurant menus grouped by category
- Register, log in, log out, update profile and password
- Server-side cart per user, limited by available stock, one restaurant per cart
- Pay with Stripe Checkout; view order history and order details

**Admins**
- Create restaurants, menu categories and food items from the UI
- Optional AI helpers (Groq LLM) to generate dish descriptions/tags and summarize restaurant reviews

**Reliability and security**
- Prices are always calculated on the server from the database; the client cannot change what it pays
- Orders are confirmed by a signature-verified **Stripe webhook**, with the success page as an idempotent fallback, so a paid order is never lost or duplicated
- Atomic stock reservation prevents overselling; if stock runs out after payment, the order is cancelled and refunded automatically
- JWT in HTTP-only cookies, bcrypt password hashing, role-based access control
- Users can only read their own orders; cart and coupon routes require login
- Helmet security headers, rate limiting (strict on login/signup), CORS restricted to the frontend URL

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router, Redux Toolkit, Axios, Bootstrap |
| Backend | Node.js, Express, REST API |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcryptjs, HTTP-only cookies |
| Payments | Stripe Checkout and webhooks |
| Media / AI (optional) | Cloudinary, Groq |

## How the payment flow works

```text
Cart (server)  ->  POST /api/v1/payment/process
                     - builds a pending order from the cart using DB prices
                     - creates a Stripe Checkout session
                   User pays on Stripe
                     |
        +------------+-----------------+
        v                              v
Stripe webhook (checkout.session.completed)   Success page (fallback)
        |                              |
        +--------> fulfillCheckoutSession (idempotent) <-----+
                     - atomically claims the order (unpaid -> fulfilling -> paid)
                     - reserves stock atomically; refunds if out of stock
                     - clears the cart
```

## Project Structure

```text
foodiehub/
├── frontend/              # React + Vite app
│   └── src/
│       ├── components/    # Pages and UI components
│       ├── redux/         # Slices and actions
│       └── utils/api.js   # Axios client
└── backend/               # Express API
    ├── controllers/       # Request handlers
    ├── models/            # Mongoose schemas
    ├── routes/            # API routes
    ├── middlewares/       # Auth, roles, error handling
    ├── services/          # Order fulfilment, AI helpers
    └── config/            # Database, Stripe, Cloudinary
```

## Getting Started

### Prerequisites
- Node.js 18 or later
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A [Stripe](https://stripe.com) account in test mode and the [Stripe CLI](https://stripe.com/docs/stripe-cli)
- Optional: Cloudinary (avatar uploads), Groq (AI features)

### 1. Install

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure

Create `backend/config/config.env` (it is git-ignored; never commit it):

```env
PORT=4000
NODE_ENV=DEVELOPMENT

DB_LOCAL_URI=your_mongodb_atlas_connection_string

JWT_SECRET=use_a_long_random_secret
JWT_EXPIRE=90d
JWT_EXPIRES_TIME=90

FRONTEND_URL=http://localhost:5173

STRIPE_SECRET_KEY=sk_test_...
STRIPE_API_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GROQ_API_KEY=
EMAIL_USERNAME=
EMAIL_PASSWORD=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_FROM=
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Optional frontend variable for a deployed API: `VITE_API_URL=https://your-api-domain.com`. When it is not set, Vite proxies `/api` to `http://localhost:4000`.

### 3. Run the Stripe webhook listener

```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:4000/api/v1/stripe/webhook
```

Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET` and restart the backend. In production, create a webhook endpoint in the Stripe dashboard pointing at `https://your-api-domain.com/api/v1/stripe/webhook` and use that endpoint's signing secret.

### 4. Start the app

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173. On Windows PowerShell with restricted scripts, use `npm.cmd` instead of `npm`.

### 5. Create an admin

Register a normal account, then in MongoDB Atlas open the `users` collection and change that user's `role` from `"user"` to `"admin"`. Refresh the site to see the admin controls (add restaurants, menu categories and food items).

### Test payment

Use Stripe's test card `4242 4242 4242 4242`, any future expiry date, any CVC and any address.

## API Overview

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/users/signup` | Public | Create an account |
| POST | `/api/v1/users/login` | Public | Log in |
| GET | `/api/v1/users/me` | User | Current profile |
| GET | `/api/v1/eats/stores` | Public | List and search restaurants |
| POST | `/api/v1/eats/stores` | Admin | Create a restaurant |
| GET | `/api/v1/eats/menus/:storeId` | Public | Menu for a restaurant |
| POST | `/api/v1/eats/item` | Admin | Create a food item |
| GET | `/api/v1/eats/cart/get-cart` | User | Read the cart |
| POST | `/api/v1/eats/cart/add-to-cart` | User | Add an item |
| POST | `/api/v1/payment/process` | User | Start Stripe Checkout (prices computed on the server) |
| POST | `/api/v1/stripe/webhook` | Stripe | Confirm paid orders |
| POST | `/api/v1/eats/orders/new` | User | Confirm an order after redirect (idempotent) |
| GET | `/api/v1/eats/orders/me/myOrders` | User | Order history |
| GET | `/api/v1/eats/orders/:id` | Owner/Admin | Order details |

Protected routes require the JWT cookie; admin routes also require the `admin` role.

## Troubleshooting

- **`querySrv ECONNREFUSED` when connecting to Atlas**: your network's DNS is refusing SRV lookups. Add `require("dns").setServers(["8.8.8.8", "1.1.1.1"]);` as the first line of `backend/server.js`.
- **Webhook returns 400**: the `whsec_...` value is wrong or the backend was not restarted after changing it.
- **CORS error**: `FRONTEND_URL` must exactly match the address in your browser.

## Roadmap

- Apply coupon codes at checkout (validation API is in place)
- Forgot/reset password pages (backend endpoints exist)
- Order status tracking for customers and restaurants
- Reviews and ratings submission UI
- Automated tests and CI, deployment

## License

Educational and portfolio use.

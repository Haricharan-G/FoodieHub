# Food Ordering Web Application

A full-stack food ordering application built with the MERN stack during the **WebStack Academy internship**. Users can discover restaurants, browse menus, manage a cart, authenticate securely, place orders, and complete payments through Stripe.

## Features

- Browse, search, sort, and filter restaurants
- View restaurant menus and food items
- Register, log in, log out, and manage a user profile
- Secure password hashing and JWT-based authentication
- Add, update, and remove items in a user-specific cart
- Create orders and process payments with Stripe Checkout
- Admin-only restaurant, menu, and food-item management
- Cloudinary avatar uploads
- API error handling, loading states, and toast notifications

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router, Redux Toolkit, Axios, Bootstrap/CSS |
| Backend | Node.js, Express, REST APIs |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, bcryptjs, HTTP-only cookies |
| Payments | Stripe |
| Media | Cloudinary |
| Testing | Postman |

## Architecture

```text
React + Redux frontend
        |
        | Axios / REST API
        v
Node.js + Express backend
        |
        | Mongoose
        v
MongoDB Atlas

External services: Stripe (payments) and Cloudinary (images)
```

## Project Structure

```text
FoodProject/
├── frontend/                 # React + Vite application
│   └── src/
│       ├── components/       # UI pages and reusable components
│       ├── redux/            # Redux slices and actions
│       └── utils/api.js      # Axios API client
├── backend/                  # Node.js + Express API
│   ├── controllers/          # Application business logic
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API routes
│   ├── middlewares/          # Auth and error middleware
│   ├── services/             # External service logic
│   └── config/               # Database and environment configuration
└── README.md
```

## Prerequisites

- Node.js 18 or later
- npm
- A MongoDB Atlas database
- Stripe test keys
- Cloudinary account credentials (required for image uploads)

## Installation

Clone the repository and install dependencies for both applications.

```bash
git clone <your-repository-url>
cd FoodProject

cd backend
npm install

cd ../frontend
npm install
```

## Environment Variables

Create `backend/config/config.env` using the following template. Never commit real credentials.

```env
PORT=4000
NODE_ENV=DEVELOPMENT

DB_LOCAL_URI=your_mongodb_atlas_connection_string

JWT_SECRET=use_a_long_random_secret
JWT_EXPIRE=90d
JWT_EXPIRES_TIME=90

FRONTEND_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_API_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret  # whsec_... (see Stripe webhook setup)

EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=your_email_host
EMAIL_PORT=your_email_port
EMAIL_FROM=your_sender_address

GROQ_API_KEY=your_groq_api_key
```

Optional frontend environment variable for a deployed API:

```env
VITE_API_URL=https://your-api-domain.com
```

When `VITE_API_URL` is not set, Vite forwards `/api` requests to the local backend at `http://localhost:4000`.

## Running Locally

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> On Windows PowerShell systems where script execution is restricted, run commands as `npm.cmd run dev` instead.

## Stripe Webhook Setup

Orders are confirmed by a Stripe webhook (`checkout.session.completed`), so a paid order is never lost if the user closes the tab. The success page also confirms the order as a safe fallback; confirmation is idempotent, so an order is never created twice.

Local development with the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```
stripe listen --forward-to localhost:4000/api/v1/stripe/webhook
```

Copy the `whsec_...` secret it prints into `STRIPE_WEBHOOK_SECRET`. In production, add an endpoint
`https://your-api-domain.com/api/v1/stripe/webhook` in the Stripe dashboard (event: `checkout.session.completed`)
and use that endpoint's signing secret.

## Main API Routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/users/signup` | Create an account |
| POST | `/api/v1/users/login` | Log in |
| GET | `/api/v1/users/me` | Get current user profile |
| GET | `/api/v1/eats/stores` | Get restaurants and search results |
| GET | `/api/v1/eats/stores/:storeId` | Get one restaurant |
| GET | `/api/v1/eats/menus/:storeId` | Get restaurant menu data |
| GET/POST | `/api/v1/eats/cart` | Read or update the cart |
| GET/POST | `/api/v1/eats/orders` | Manage orders |

Protected routes require a valid JWT cookie. Restaurant and food-management routes also require an `admin` role.

## Testing and Validation

- Use **Postman** to validate API request bodies, responses, error messages, and protected endpoints.
- Run frontend quality checks:

```bash
cd frontend
npm run lint
npm run build
```

## Learning Outcomes

This project provided practical experience with:

- Component-driven frontend development with React
- Global state management with Redux Toolkit
- Designing and consuming REST APIs
- Express routes, controllers, middleware, and error handling
- MongoDB Atlas database design with Mongoose schemas
- JWT authentication and password hashing
- Stripe payment flow integration
- Debugging frontend-backend communication and environment configuration

## Security Notes

- Keep `config.env` private and add it to `.gitignore` before pushing to a public repository.
- Rotate any credentials that were ever committed or shared.
- Never expose Stripe secret keys, JWT secrets, database connection strings, or Cloudinary secrets in frontend code.

## License

This project is intended for educational and portfolio use.

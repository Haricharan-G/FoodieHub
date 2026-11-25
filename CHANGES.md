# Phase 1 fixes: what changed and why

## Install / run
```
cd backend
npm install            # adds helmet + express-rate-limit, removes unused packages
```
Add to `backend/config/config.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen` or the Stripe dashboard
NODE_ENV=DEVELOPMENT                   # or PRODUCTION when deployed
FRONTEND_URL=http://localhost:5173
```
Run with `npm run dev` (works on Windows, macOS and Linux now).
Test the webhook locally: `stripe listen --forward-to localhost:4000/api/v1/stripe/webhook`

## Payments / orders
| Problem | Fix |
|---|---|
| Client sent prices to Stripe (could pay Rs.1 for anything) | `paymentController` builds line items from the user's cart + FoodItem prices in the DB; request body is ignored |
| Order only created from the success page (paid but no order if tab closed) | New `POST /api/v1/stripe/webhook` (signature-verified) creates the order; success page is an idempotent fallback |
| Duplicate orders / double stock decrement on refresh | Pending order is created before checkout; fulfilment atomically claims it (`unpaid -> fulfilling -> paid`); `stripeSessionId` is unique |
| Any user could confirm another user's / an unpaid session | Session must belong to `req.user` (metadata.userId) and be `payment_status === "paid"` |
| Overselling (non-atomic pre-save hook, ran after payment) | Atomic `findOneAndUpdate({stock: {$gte: qty}}, {$inc: ...})`; if stock ran out the order is rolled back, cancelled and refunded |
| Address was `line1 + line1` | `line1, line2` |
| `/orders/me/myOrders` shadowed by `/:id`; anyone could read any order | Route order fixed; order owner/admin check |
| Unpaid checkouts appeared in "My Orders" | Only paid/refunded orders listed; abandoned unpaid orders purged after 24h |

## Authorization
- Cart routes: `protect` on all, user comes from the JWT, not `req.body.userId`; quantity validated and capped by stock; `stock` now included in the populated cart so the Cart page limit actually works; empty cart returns 200 with an empty cart.
- Coupons: create/update/delete are admin-only; validate uses the code the user typed and ignores expired coupons (it previously ignored the code entirely). Fixed `upperCase` -> `uppercase`.
- AI routes: generate/analyze are admin-only; reviews require login, use the account name, are validated (1-5 + comment) and limited to one per user per restaurant.

## Hardening / bugs
- Error middleware responds in every environment (previously hung unless NODE_ENV was exactly DEVELOPMENT/PRODUCTION), fixed `castError` typo, JWT errors -> 401, no stack traces outside DEVELOPMENT.
- `app.js`: CORS from `FRONTEND_URL` (was hardcoded localhost), helmet, rate limiting (strict on login/signup/forgot-password), JSON limit 2mb for base64 avatars, fixed `views` path, removed duplicate body parsers and the unused `body-parser` require.
- Auth: forgot-password no longer reveals which emails exist; changed-password check returns 401 and `passwordChangedAt` is now actually set; cookie `SameSite`/`Secure` for production; token no longer echoed in the JSON body; logout clears the cookie properly.
- `package.json`: cross-platform scripts (`SET` was Windows-only and `start` pointed at the wrong path), removed `nodejs` and duplicate `bcrypt`.

## Not covered yet (next steps)
Mass-assignment on food/menu create-update (`req.body` passed straight to Mongoose), input validation library (Joi/Zod), applying a coupon discount at checkout, tests + CI, forgot-password frontend pages, order status updates, and cleanup of the course-script comments in `menuController.js`.

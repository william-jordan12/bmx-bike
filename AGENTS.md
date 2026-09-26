# Working agreements

## Git
- Always commit and push finished work to `main` once checks pass. Do not wait for a second confirmation.
- Repo has no local git identity. Commit with per-command flags:
  `git -c user.name=william-jordan12 -c user.email=william-jordan12@users.noreply.github.com commit ...`
- Never commit `.env`, `.env.local`, or any credential. `.env.example` is tracked and must stay comment-only.
- If a secret was pasted into chat, treat it as compromised, say so, and tell the user to rotate it. Never echo it back.

## Checks
Run all three before committing:
- `npm.cmd run lint` — eslint over `app components lib proxy.ts`
- `npm.cmd run typecheck` — `tsc --noEmit`
- `npm.cmd run build` — webpack build

Use `npm.cmd`, not `npm`; PowerShell blocks the bare shim.

## Dependencies
- `node_modules` is usually absent in this repo. Registry access has been unreliable, so do not assume `npm install` will succeed.
- To verify locally, link the matching dependency set from the sibling project and remove the link afterwards:
  `New-Item -ItemType Junction -Path .\node_modules -Target ..\cactus-2\node_modules`, then `cmd /c rmdir .\node_modules` to clean up.
- Never let that junction survive a commit; it must not appear in git status.

## Build quirk
- `next build` runs with `--webpack` on purpose. Turbopack fails when the external `node_modules` junction is present.

## Admin area
- `/admin` needs a Postgres database. Without `DATABASE_URL` the storefront still works and admin routes return 503.
- `ADMIN_INITIAL_PASSWORD` is required in production; the dev fallback is for local use only.
- Schema, admin row, starter categories, demo orders, and the 10 bikes from `data/bmx_bikes.json` self-seed on the first request that touches the database.
- Products live in `bmx_products`; `data/bmx_bikes.json` is only the first-run seed plus the storefront's offline fallback.
- Admin auth: scrypt hashes, one session per admin row, `bmx_admin_session` HttpOnly cookie. Password changes rotate the session and sign out other devices.
- Local credentials live in `.env.local` (gitignored). Rotate the Neon password if a connection string was ever shared in chat.

## Product images
- Drag-and-drop uploads go through `app/api/admin/upload` -> `lib/storage.ts`, which sniffs magic bytes (never trust the filename) and caps files at 8MB.
- Default driver is `public/uploads` on local disk: fine for development, wiped on serverless redeploy.
- Set `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` to make uploads permanent. `res.cloudinary.com` is already allowed in `next.config.ts`; add any other image host there too.
- `GET /api/admin/upload` reports the active driver so the dashboard can warn about non-persistent storage.

## Products and categories
- Products live in `bmx_products`; `data/bmx_bikes.json` is only the first-run seed plus the storefront's offline fallback. The seed only runs when the table is completely empty, so a product deleted on purpose stays deleted.
- Categories are admin-managed in `bmx_categories`. Product writes validate `category` against those names, so a new department works everywhere (storefront filter, /shop) as soon as the category row exists.
- `GET /api/categories` is public and returns `product_count`. The storefront builds its filter from it, so the nav never lists a department that does not exist.
- Order items store `product_slug` as plain TEXT, not a foreign key, so deleting a product never damages order history.

## Reviews
- `bmx_reviews` holds customer reviews with a `pending -> approved | rejected` moderation flow. Submissions are never public until approved.
- Submissions are rate limited to 4 per product per author per hour and a `website` honeypot field must stay empty.
- `verified` is set automatically when the author's name matches a customer with a delivered order for that product.
- `GET /api/reviews` returns every approved review across the store, so `/reviews` shows real written reviews instead of catalog numbers.
- `GET /api/products` replaces the seeded `rating`/`review_count` with the real approved-review average whenever a product has approved reviews, and falls back to the seeded numbers otherwise.

## Payment requests
- The 11 payment methods live in `lib/payments.ts` (`PAYMENT_METHODS`). `isPaymentMethod` is the only gate: the API rejects anything not in that list.
- Checkout reserves the order first, then builds the customer's message with `buildPaymentRequestMessage` and hands back WhatsApp (`wa.me`) and `mailto:` links. Nothing is charged in-browser.
- Orders record `payment_method`, `billing_address` and `contact_channel`. `delivery_method` is kept in sync with `contact_channel` for older rows.
- `store_name` in `bmx_settings` is what fills `[Store Name]` in the message. The WhatsApp button stays disabled until a WhatsApp number is saved in Settings.
- Orders are priced from `bmx_products`, so products added in the admin are orderable. The JSON catalog is only a fallback when `DATABASE_URL` is missing.
- `lib-hooks` lint note: `setState` calls belong inside the `void (async () => {})()` of an effect, and the `let active` flag plus the returned cleanup must be declared in the effect body, not the IIFE. Putting `setState` directly in the effect body trips `react-hooks/set-state-in-effect`; returning the cleanup from inside the IIFE silently never runs it.

## Deploy prerequisites
- Host env vars: `DATABASE_URL`, and `ADMIN_INITIAL_PASSWORD` only for a brand new database.
- First request after a cold start is slow while the pool connects and the schema is created.

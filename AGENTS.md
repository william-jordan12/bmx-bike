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

## Deploy prerequisites
- Host env vars: `DATABASE_URL`, and `ADMIN_INITIAL_PASSWORD` only for a brand new database.
- First request after a cold start is slow while the pool connects and the schema is created.

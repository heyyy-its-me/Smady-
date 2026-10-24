# Deploying SMADY to Vercel + a backend host (Render/Railway)

Vercel is built for frontend/serverless — it does **not** run a persistent FastAPI process well
(long-lived DB connections, WebSockets, background polling all fight its serverless model). So
the simple, reliable split is: **frontend on Vercel, backend on Render or Railway** (both have a
free/cheap tier, and both run FastAPI natively via a `Procfile`/start command, no rewrite needed).

## 0. Get your code out of Emergent
In the Emergent chat, use **"Save to GitHub"** (top of the chat input) to push this repo to your
own GitHub account. Everything below starts from that GitHub repo.

## 1. Backend → Render (or Railway) — do this first, you need its URL for step 2

1. Create a new **Web Service** on Render, connect your GitHub repo, root directory `backend/`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add these Environment Variables directly in the backend host. Do not copy values from a committed or local `.env`; use newly rotated credentials and your approved secret store:

   | Variable | Value / where it comes from |
   |---|---|
   | `DB_HOST` | Your AWS RDS endpoint (unchanged — you keep using the same RDS instance) |
   | `DB_PORT` | `5432` |
   | `DB_USER` | RDS master username |
   | `DB_PASSWORD` | RDS master password |
   | `PG_DATABASE` | `postgres` |
   | `DB_SCHEMA` | `smady` (the app-internal bookkeeping schema — do not change) |
   | `APP_ENV` | `production` |
   | `DB_SSLMODE` | `verify-full` |
   | `DB_SSL_CA` | Path to the mounted RDS CA bundle, if it is not available in the system trust store |
   | `COOKIE_SECURE` | `true` |
   | `COOKIE_SAMESITE` | `lax` |
   | `HSTS_ENABLED` | `true` only after confirming all production hostnames are HTTPS-only |
   | `ICP_ENGINE_API_URL` | The approved ICP Engine endpoint |
   | `N8N_LEADS_WEBHOOK_URL` | Your n8n `lead-management-V2` webhook URL |
   | `N8N_OUTREACH_WEBHOOK_URL` | Your n8n Outreach webhook URL |
   | `N8N_MEETINGS_WEBHOOK_URL` | (if/when you wire an n8n meetings workflow) |
   | `N8N_PROPOSALS_WEBHOOK_URL` | (if/when you wire an n8n proposals workflow) |
   | `N8N_CALLBACK_SECRET` | Generate a new independent random secret of at least 64 characters; update it in every n8n callback node. |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credentials for your Google Cloud OAuth **Web application** client. |
   | `GOOGLE_REDIRECT_URI` | `https://YOUR-FRONTEND-DOMAIN/api/auth/google/callback` (must match the Google OAuth client exactly). |
   | `GOOGLE_TOKEN_ENCRYPTION_KEY` | A Fernet key generated with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`; keep it stable and secret. |
   | `PUBLIC_BACKEND_URL` | Your Render service's public URL, e.g. `https://smady-backend.onrender.com` (needed so the backend can tell n8n where to call back) |
   | `CORS_ORIGINS` | Exact Vercel/custom frontend origins, comma-separated; never use `*`. |
   | `JWT_SECRET` | Generate a new independent random secret of at least 64 characters. Rotating this logs out existing sessions. |

5. Deploy. Note the backend origin assigned by your hosting provider — you need it next.
6. Sanity check: `curl https://YOUR-BACKEND-URL/api/auth/me` should return `401` (not a connection error) once it's live.

## 2. Frontend → Vercel

1. Import the same GitHub repo into Vercel, set **Root Directory** to `frontend/`.
2. Framework preset: Vite. Build command: `yarn build`. Output directory: `dist`.
3. Add these Environment Variables for the frontend build and same-origin API rewrite:

   | Variable | Value |
   |---|---|
   | `BACKEND_API_URL` | Backend origin only, with no trailing slash and no `/api` suffix. |
   | `VITE_LEGAL_OPERATOR_NAME` | Your actual legal business/operator name (not a placeholder). |
   | `VITE_PRIVACY_CONTACT_EMAIL` | A monitored privacy/support email address that users and Google reviewers can contact. |

4. Deploy. Record the frontend origin assigned by Vercel.
5. Go back to the backend host and update `CORS_ORIGINS` and `PUBLIC_BACKEND_URL` with the deployed origins, then redeploy the backend.

Vercel routes `/api/*` to the backend using `BACKEND_API_URL`, while the browser continues to call the same frontend origin so auth cookies remain first-party. The Google OAuth callback must use the frontend origin so the browser's one-time OAuth state cookie is sent. Configure the Google Cloud OAuth consent screen and callback as described in [`GOOGLE_N8N_SETUP.md`](GOOGLE_N8N_SETUP.md).

## 3. Update your n8n workflows

Your n8n "HTTP Request" callback nodes (in `lead-management-V2`, Outreach, etc.) that POST back to
`.../api/leads/callback`, `.../api/meetings/callback` etc. need their URL changed from the old
Emergent preview URL to the backend origin assigned by your hosting provider plus `/api/...`, and the
`X-Callback-Secret` header value updated to whatever you set for `N8N_CALLBACK_SECRET` in step 1.

## 4. Custom domain (optional)
Both Vercel and Render support custom domains and auto-HTTPS. Update `CORS_ORIGINS`,
`PUBLIC_BACKEND_URL`, and Vercel's `BACKEND_API_URL` if you change domains.

## Security follow-up: external fonts

The frontend still loads Inter from Google Fonts in `frontend/index.html` and
`frontend/src/pages/LandingV2.tsx`. Subresource Integrity is not reliable for
the dynamically served Google Fonts stylesheet. For a stricter supply-chain
boundary, verify the font license and vendor the required font files, then load
them with local `@font-face` rules. That frontend change has not been made here.

---
**You do NOT need a new database** — this deployment keeps using your existing AWS RDS Postgres
instance exactly as-is (`public` schema = real n8n data, `smady` schema = app bookkeeping).

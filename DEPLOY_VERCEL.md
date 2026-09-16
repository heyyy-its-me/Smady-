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
4. Add these Environment Variables (values are already in your current `backend/.env` — copy them):

   | Variable | Value / where it comes from |
   |---|---|
   | `DB_HOST` | Your AWS RDS endpoint (unchanged — you keep using the same RDS instance) |
   | `DB_PORT` | `5432` |
   | `DB_USER` | RDS master username |
   | `DB_PASSWORD` | RDS master password |
   | `PG_DATABASE` | `postgres` |
   | `DB_SCHEMA` | `smady` (the app-internal bookkeeping schema — do not change) |
   | `DB_SSLMODE` | `prefer` |
   | `ICP_ENGINE_API_URL` | `http://icp-engine-api-env.eba-vbwk9qkm.eu-north-1.elasticbeanstalk.com/api/v1/recommend` |
   | `N8N_LEADS_WEBHOOK_URL` | Your n8n `lead-management-V2` webhook URL |
   | `N8N_OUTREACH_WEBHOOK_URL` | Your n8n Outreach webhook URL |
   | `N8N_MEETINGS_WEBHOOK_URL` | (if/when you wire an n8n meetings workflow) |
   | `N8N_PROPOSALS_WEBHOOK_URL` | (if/when you wire an n8n proposals workflow) |
   | `N8N_CALLBACK_SECRET` | **Generate a new random secret for production** — this is the shared secret n8n sends in the `X-Callback-Secret` header. Update it in every n8n "HTTP Request" callback node too. |
   | `PUBLIC_BACKEND_URL` | Your Render service's public URL, e.g. `https://smady-backend.onrender.com` (needed so the backend can tell n8n where to call back) |
   | `CORS_ORIGINS` | Your Vercel frontend URL, e.g. `https://smady.vercel.app` (comma-separate if you have more than one, e.g. a custom domain too) |
   | `JWT_SECRET` | **Generate a new random 32+ char secret for production** — do NOT reuse the dev value. Rotating this logs out all existing sessions. |

5. Deploy. Note the resulting URL (e.g. `https://smady-backend.onrender.com`) — you need it next.
6. Sanity check: `curl https://YOUR-BACKEND-URL/api/auth/me` should return `401` (not a connection error) once it's live.

## 2. Frontend → Vercel

1. Import the same GitHub repo into Vercel, set **Root Directory** to `frontend/`.
2. Framework preset: Vite. Build command: `yarn build`. Output directory: `dist`.
3. Add one Environment Variable:

   | Variable | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | Your Render backend URL from step 1, e.g. `https://smady-backend.onrender.com` (no trailing `/api` — the frontend code appends `/api` itself) |

4. Deploy. Vercel gives you a URL like `https://smady.vercel.app`.
5. Go back to Render and update `CORS_ORIGINS` and `PUBLIC_BACKEND_URL` if you didn't have the final URLs yet, then redeploy the backend.

## 3. Update your n8n workflows

Your n8n "HTTP Request" callback nodes (in `lead-management-V2`, Outreach, etc.) that POST back to
`.../api/leads/callback`, `.../api/meetings/callback` etc. need their URL changed from the old
Emergent preview URL to your new `https://smady-backend.onrender.com/api/...`, and the
`X-Callback-Secret` header value updated to whatever you set for `N8N_CALLBACK_SECRET` in step 1.

## 4. Custom domain (optional)
Both Vercel and Render support adding a custom domain + free auto-HTTPS in their dashboards — no
code changes needed, just update `CORS_ORIGINS` / `REACT_APP_BACKEND_URL` to match once you do.

---
**You do NOT need a new database** — this deployment keeps using your existing AWS RDS Postgres
instance exactly as-is (`public` schema = real n8n data, `smady` schema = app bookkeeping).

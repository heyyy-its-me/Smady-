# Smady - AI Outbound CRM

## Original Problem Statement
Integrate a live n8n workflow instance into an existing fully-built React UI ("Smady",
formerly "Pursora"). Build the database, a thin API layer to trigger n8n webhooks and
receive async callbacks, and wire the UI to real data instead of mock data. 4 phases:
1) Auth (JWT), 2) ICP Engine, 3) Lead Management, 4) Outreach, then Dashboard metrics.

## Architecture
- /app/frontend: Vite + React + TS (port 3000). Uses `import.meta.env.REACT_APP_BACKEND_URL`
  (vite.config.ts envPrefix includes 'REACT_APP_' to expose it).
- /app/backend: FastAPI (port 8001) + PostgreSQL (SQLAlchemy async + asyncpg), schema "smady".
  - NOTE: user's real DB is AWS RDS Postgres (smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com,
    user=postgres) but no password was given this session, so a LOCAL Postgres instance was
    installed in this preview container for development. At deploy, set DB_HOST/DB_PASSWORD/
    DB_SSLMODE=require env vars to point at the real RDS instance - no code changes needed.
  - n8n webhook URLs (N8N_ICP_WEBHOOK_URL, N8N_LEADS_WEBHOOK_URL, N8N_OUTREACH_WEBHOOK_URL) are
    intentionally empty - user will add them as deployment env vars. Code gracefully reports
    "webhook_not_configured" / campaign status "Failed" instead of hanging when they're empty.
  - Async pattern: generate endpoint creates a pending DB row + fires webhook (no waiting),
    n8n calls back to /api/{icp,leads,outreach}/callback with header X-Callback-Secret
    (value = N8N_CALLBACK_SECRET env var) to update the row; frontend polls a /status endpoint.

## Completed (2026-09-04)
- Full Postgres schema: users, login_attempts, password_reset_tokens, icp_profiles, lead_runs,
  leads, outreach_campaigns, outreach_emails (all under schema "smady")
- Phase 1 Auth: JWT httpOnly cookies (access 15min/refresh 7day), bcrypt, brute-force lockout
  (5 fails/15min, keyed on email), signup/login/logout/me/refresh/forgot-password/reset-password
- Phase 2 ICP: POST /api/icp/generate -> webhook trigger, /api/icp/callback, /api/icp/status/{id},
  /api/icp/latest. Frontend polls and shows result or "not configured" toast.
- Phase 3 Leads: GET /api/leads, /api/leads/generate + callback + status, /api/leads/upload
  (creates real rows, demo data - no real CSV parsing yet), /api/leads/send-to-outreach
- Phase 4 Outreach: GET/POST /api/outreach/campaigns, /api/outreach/callback, /api/outreach/stats
  (real open/reply/bounce rate % computed against emails sent)
- Dashboard: GET /api/dashboard/stats - real Postgres aggregations for all stat cards, leads
  growth (12mo), pipeline funnel, lead source breakdown (%), activity feed, week-over-week
  email/reply comparison. Meetings/Proposals/Reports pages intentionally left on mock data
  (out of the 4-phase scope).
- Frontend: lib/api.ts (axios, withCredentials), AuthContext + AppDataContext fully rewired to
  real API calls with polling, Login/Signup error toasts, AppShell loading state during auth check.
- Tested via testing_agent (iteration_1): 33/34 backend pytest cases + full Playwright frontend
  pass. Fixed after report: brute-force identifier bug (was keyed on rotating ingress IP),
  lead source donut showing raw counts as "%", outreach open/reply/bounce rate denominator,
  missing sent_date on Sent campaigns, contradictory success+error toast on failed campaign send,
  "vs yesterday" mislabel, missing Jan tick on leads growth chart, native <select> replaced with
  shadcn Select on company size filter, send-to-outreach now validates UUIDs + 404s on no match,
  deprecated @app.on_event migrated to FastAPI lifespan, unused imports removed, race-safe
  ON CONFLICT upsert for first failed login attempt.

## Known/Deliberate Notes
- Local Postgres is DEV ONLY. Production must supply real RDS password via DB_PASSWORD env var.
- n8n webhooks are unconfigured by design in this env - "webhook_not_configured" / "Failed" states
  are the CORRECT expected behavior here, not bugs.
- /api/leads/upload still fabricates demo rows (no real file/CSV parsing) - matches old mock
  UX (dropzone has no functioning file input), flagged as backlog if real CSV import is wanted.

## Backlog / Next (P1)
- Real CSV file upload + parsing for "Upload Leads" (currently demo-data insert only)
- Wire ForgotPassword.tsx page to the already-built /api/auth/forgot-password + reset-password
  endpoints (backend done, frontend page still uses a mock timeout)
- When user provides real RDS password + n8n webhook URLs at deploy time, no code changes needed,
  only env vars

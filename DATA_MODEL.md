# SMADY — Data Model & Page-by-Page Field Reference

Generated during backend integration (Phase 1-2). This documents every table/column currently
wired to the UI, and which page/component consumes it. Update this file as later phases land.

## Database schema overview

Two schemas are in use on the same RDS Postgres instance:

- **`public`** — the REAL, n8n-managed production schema. Never redefine or drop columns here;
  we only read/write existing columns.
- **`smady`** — app-internal bookkeeping schema we created, for data the `public` schema has no
  room for (request tracking, filters used for a run, login rate-limiting, password resets).
  This is NOT shown to n8n and has no bearing on the real pipeline data.

⚠️ Known landmine (fixed): several `smady.*` tables had FK constraints pointing at a stale,
orphaned `smady.users` table (leftover from an earlier bad setup) instead of the real
`public.users`. Fixed for `lead_runs`, `password_reset_tokens`, `outreach_campaigns` (constraint
re-pointed to `public.users`, added as `NOT VALID` to avoid failing on pre-existing junk rows).
`smady.company_profiles` and `smady.leads`/`outreach_emails` chains still reference `smady.users`
but are not currently written to for real users — check before wiring anything new to them.

---

## `public` (real) tables

| Table | Key columns | Written by | Read by |
|---|---|---|---|
| `customers` | id, name | signup | — |
| `users` | id, email, password_hash (pbkdf2), full_name, customer_id, is_active | signup | login, /auth/me |
| `company_profiles` | id, customer_id, company_name, product_name, positioning, differentiator, core_problem, buyer_pain, target_segment, confidence_score, icp_data (JSONB, full raw ICP API response), gtm_strategy (JSONB), buyer_persona (JSONB) | `POST /api/icp/generate` (upsert by customer_id) | ICP Engine page (via `icp_profiles` mirror, see below), `GET /api/company-profiles/{id}` (Reports page detail modal) |
| `lead_results` | request_id, customer_id, user_id, leads (JSONB array, raw n8n lead objects), total_count, status, error, created_at/completed_at (epoch ms), updated_at | `POST /api/leads/generate` (insert pending), `POST /api/leads/callback` (n8n writes leads here) | Leads page (`GET /api/leads`), Reports page (`GET /api/lead-results/{request_id}`) |
| `run_status` | request_id, stage, status, updated_at | leads/generate, leads/callback | (bookkeeping only, not directly rendered yet) |
| `meetings` | id, user_id, request_id, lead_name, lead_email, meeting_date, meeting_link, status, source (`manual`/`agent`), notes | `POST /api/meetings/schedule` (manual), `POST /api/meetings/callback` (n8n auto-booked) | Meetings page (calendar + upcoming list) |
| `proposal_results` | id, user_id, request_id, lead_name, lead_email, proposal_json (JSONB), guardrail_errors (JSONB), reviewer_approved, final_status | `POST /api/proposals/generate`, `POST /api/proposals/callback`, approve/reject endpoints | Proposals page |

## `smady` (app-internal bookkeeping) tables

| Table | Key columns | Purpose |
|---|---|---|
| `login_attempts` | identifier (email), attempts, locked_until | Brute-force lockout on `/auth/login` |
| `password_reset_tokens` | user_id (→ public.users), token, expires_at, used | `/auth/forgot-password`, `/auth/reset-password` |
| `icp_profiles` | user_id, request_id, status, input (JSONB, the form payload), result (JSONB, the mapped ICPResult) | Lets the frontend poll `/api/icp/status/{request_id}` even though the real ICP API call is synchronous. `result` is what actually renders on the ICP Engine page and the "View Full Analysis" modal. |
| `lead_runs` | user_id, customer_id, request_id, filters (JSONB, the exact form payload sent to n8n), status | Backs the "Run History" picker on the Leads page (date/time, filter summary, per-run status) — `public.lead_results` has no room for the original filter criteria, so this fills that gap. |
| `leads`, `outreach_campaigns`, `outreach_emails` | — | Legacy tables from an earlier (pre-real-schema) build. Still used **only** by `dashboard_router.py` (Phase 6, not yet migrated) and `outreach_router.py` (Phase 3, not yet migrated). Will be replaced by `public.lead_results` / real outreach data in later phases. |

---

## Page-by-page: what's rendered from where

### Login / Signup / Forgot Password (`/login`, `/signup`, `/forgot-password`)
- `public.users` — create/verify user (pbkdf2 hash). `public.customers` — created alongside signup.
- `smady.login_attempts` — lockout after 5 failed attempts. `smady.password_reset_tokens` — reset flow.

### ICP Engine (`/icp`)
- Calls the real ICP Engine REST API (`ICP_ENGINE_API_URL` env, synchronous, no auth) directly — not an n8n webhook.
- Result chips shown: **Industry**, **Target Roles**, **Geography**, **Pain Points** ← mapped from the API's `analysis.industries`, `buyer_persona.role`, `gtm_strategy.target_countries`, `buyer_persona.pain_points`.
- **Company Size** chip group is intentionally always empty — the real API has no company-size field (confirmed with product owner); Leads page has its own independent company-size filter.
- "View Full Analysis" modal (`IcpDetailModal.tsx`) additionally shows: positioning, differentiator, core problem, buyer pain, confidence score, GTM channels/regions, secondary ICPs — all stored in `icp_profiles.result` / mirrored into `public.company_profiles`.
- "Save & Use in Lead Management" → navigates to `/leads`, which auto pre-fills Industry/Roles/Countries from this same ICP result (via shared `icp` state in `AppDataContext`).

### Leads (`/leads`)
- Filter form (Industry, Roles, Countries, Cities, Company Size) → `POST /api/leads/generate` → fires n8n `lead-management-V2` webhook (fire-and-forget) → n8n calls back `POST /api/leads/callback` with the results, which land in `public.lead_results.leads`.
- Table columns: Lead (name/title), Company, Email, LinkedIn, Status, Source — from `_normalize_lead()` in `leads_router.py`, defensively mapped from whatever field names n8n sends (`Contact Name`, `Designation`, `Company Name`, `Email`, `LinkedIn`, `Qualification Status`, etc.)
- **Lead Detail modal** (click a lead name, or "View lead" kebab item) — `LeadDetailModal.tsx` — additionally surfaces: Lead Score, Priority, ICP Match, Seniority, Employees, Founded Year, Funding Stage, Annual Revenue, Technologies, Location, Phone, Industry, Company Description, Personalization Hook, Pain Points Matched, Recommended Action. All of this is captured by the backend even though only a subset shows in the main table.
- **Run History** picker (top-right) — lists past executions with date/time, status, filter summary, and lead count, backed by `GET /api/leads/runs` (reads `smady.lead_runs` joined with live counts from `public.lead_results`). Selecting a run reloads the table scoped to that run.
- **Pagination** — `GET /api/leads?run_id=&limit=&offset=` returns one page (default 25/page) plus `total`, `verified_count`, `ready_count` computed server-side over the FULL run (not just the current page) so the stat cards stay accurate even with hundreds of leads in one run.
- **Download (Excel)** — always exports the FULL run (re-fetches with `limit=total`), not just the visible page. Includes all detail-modal fields as extra columns.
- **Upload** — still a synthetic/demo insert (`POST /api/leads/upload`) creating placeholder rows in `public.lead_results`; real CSV parsing is a separate, not-yet-built feature.

### Outreach (`/outreach`) — Phase 3, not yet migrated to real schema
- Currently backed by `smady.outreach_campaigns` / `smady.outreach_emails` / `smady.leads` (legacy tables). Stat cards: Emails Sent, Open Rate, Reply Rate, Bounce Rate — all computed from `outreach_emails.status` counts.

### Meetings (`/meetings`)
- Calendar + upcoming list — `public.meetings`, split by `source` (`manual` = booked via the in-app form, `agent` = auto-booked by n8n callback).

### Proposals (`/proposals`)
- `public.proposal_results` — stat cards (Auto-Sent, Pending Review, Approval Rate) computed client-side from `final_status`.

### Dashboard (`/dashboard`) — Phase 6, not yet migrated to real schema
- All stats (Leads Today, Total Leads, Emails Sent, Meetings Booked, Leads Growth chart, Pipeline Funnel, Lead Source donut, Activity Feed, Heatmap, weekly comparisons) are computed in `dashboard_router.py` from the **legacy** `smady.leads` / `outreach_campaigns` / `outreach_emails` / `icp_profiles` / `lead_runs` tables — will read near-zero data until migrated to `public.lead_results` etc. in Phase 6.

### Reports (`/reports`)
- "Execution History" table — `GET /api/dashboard/history` (legacy `smady.lead_runs`/`icp_profiles`/`outreach_campaigns`).
- "Meetings & Proposals History" table — `GET /api/history` (the REAL unified history: `public.company_profiles`, `lead_results`, `meetings`, `proposal_results`). Clicking "View" on an ICP or Leads row opens a detail modal via `GET /api/company-profiles/{id}` or `GET /api/lead-results/{request_id}`.
- Funnel/Multi-line/Donut charts and Campaign Performance table are still **mock data** (`src/mock/reports.ts`) — not yet wired, Phase 6 scope.

---
_Last updated: Phase 2 (ICP + Leads) completion._

# SMADY — Backend Integration PRD & Progress

## Original problem statement
Wire the ~95%-complete, FROZEN frontend UI to the real FastAPI backend, n8n workflows, custom
auth, and AWS RDS Postgres database. 6 phases: Auth, ICP+Leads, Outreach, Meetings, Proposals,
Reports/Dashboard. Ground rule: no assumptions — inspect and ask before wiring anything unclear.

## Architecture
- React (Vite) frontend, FastAPI backend, AWS RDS Postgres (external, pre-existing).
- `public` schema = REAL data written by n8n + this app (users, customers, company_profiles,
  lead_results, run_status, meetings, proposal_results, proposal_review_log, propmeetings, pricing_packages).
- `smady` schema = app-internal bookkeeping only (login_attempts, password_reset_tokens,
  icp_profiles, lead_runs, outreach_campaigns, outreach_emails, proposal_review_log [test data]).
- Full page/table/column reference: /app/DATA_MODEL.md
- Deployment guides: /app/DEPLOY_VERCEL.md, /app/DEPLOY_AWS.md

## Schema reconciliation (Sep 2026 — master build prompt)

### Table identity findings
| Table | Schema | Rows | Written by | Notes |
|---|---|---|---|---|
| `proposal_review_log` | `public` | 0 | n8n Proposal Agent | INTEGER serial id, meeting_id=TEXT (Fireflies transcript id). n8n writes here but has not run yet against this DB. |
| `proposal_review_log` | `smady` | 12 | App (previous sessions) | UUID id, has user_id FK but points to smady.users (orphan), all rows from test user. |
| `propmeetings` | `public` | 0 | n8n Meeting Scheduler | INTEGER serial id, no user_id set by n8n. |
| `propmeetings` | `smady` | 1 | App (previous sessions) | UUID id, has 1 test row. |
| `meetings` | `public` | 11 | App (meetings_router) | UUID id, proper user_id. This is the LIVE meetings table. DIFFERENT from propmeetings. |
| `pricing_packages` | `public` | 3 | n8n admin | Enterprise/Starter/Growth with floor/ceiling prices. |
| `proposal_results` | `public` | 6 | App (proposals_router) | App-generated proposals (not n8n Proposal Agent). |

### Key decisions
- **Proposals page reads from `public.proposal_review_log`** (n8n's table) for the review queue.
  Fallback: `public.proposal_results` for app-generated proposals.
- **Ownership gap**: n8n does NOT set user_id/customer_id in `public.proposal_review_log`. Scoping
  is via lead_email ∩ user's lead_results. When no leads exist, all proposals shown (safe for
  single-tenant use). Columns exist in the table; fix = have n8n populate them (out of scope).
- **Approve webhook**: GET `/webhook/proposal-approve?meeting_id={id}` on n8n (same URL as email button).
- **Reject form**: POST `/form/proposal-feedback` with fields `Meeting ID` + `Feedback` (min 10 chars).
- **Meetings n8n webhook**: POST `/webhook/book-slot` with exact n8n form field names.
- **`smady.proposal_review_log.user_id_fkey` → `smady.users`** (not public.users). Not fixed in
  this session — will fail on insert for real users. Use `public.proposal_review_log` for new data.

### n8n webhook URLs (confirmed live)
- Meetings book-slot: `https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/book-slot`
- Proposals approve: `https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/proposal-approve`
- Proposals reject form: `https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/form/proposal-feedback`
- Outreach: `https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/2e460161-9738-4b81-8d65-44780979541a`

## Completed (this session, Sep 2026)
- Phase 1 (Auth) - DONE, tested. Fixed pbkdf2 password hashing (was bcrypt-only, real prod
  users use pbkdf2$210000$salt$hash). Fixed frontend/.env /api suffix bug causing 404s on every
  API call (platform reset the env var; api.ts now appends /api itself, immune to future resets).
- Phase 2 (ICP + Leads) - DONE, tested with a real live n8n run.
  - ICP: real synchronous REST call to ICP Engine API (not a webhook), added required
    Business Stage/Priority fields to the form, mapped response into frozen UI + public.company_profiles.
  - Leads: real lead-management-V2 webhook + callback wired and live-tested (1 real lead:
    Sean Clark @ shoes.com). Added Run History picker, pagination (25/page), Lead/ICP detail
    modals (surfaces Lead Score/Priority/personalization hook/etc. not shown in the main table),
    ICP->Leads auto-prefill, enriched Excel export.
  - Found and fixed a real DB landmine: several smady.* FK constraints pointed at a stale,
    orphaned smady.users table instead of public.users - would have broken password reset,
    lead run history, and outreach campaigns for every real user. Fixed (NOT VALID, non-destructive).
- Phase 3 (Outreach) - partially done. Fixed recipient sourcing to read real
  public.lead_results (was reading the legacy/disconnected smady.leads table). Added
  "target a specific past execution" recipient option + reused Run History picker. Added a
  "Send All N to Outreach" bulk button on the Leads page (previously required selecting one row
  at a time). NOT live-tested - creating a campaign fires a REAL n8n webhook that sends real
  emails; deliberately held off pending explicit user go-ahead.
- Phase 4 (Meetings - original PRD numbering) - DONE, tested. Manual scheduling -> public.meetings was already wired;
  added double-booking prevention (409 + clear toast) since it was missing.
- Deployment docs (Vercel+Render split, and all-AWS) written per user request.
- Phase 5 (Proposals — master build prompt Phase 1) - DONE:
  - Added `public.proposal_review_log` model (n8n's table, INTEGER id) + `public.pricing_packages` model.
  - `GET /api/proposals` returns n8n review queue + app proposals, scoped by lead_email.
  - `GET /api/proposals/packages` returns live pricing catalog (3 active packages).
  - `POST /api/proposals/{id}/approve` → calls n8n approve GET webhook (LIVE-FIRE, needs explicit confirm).
  - `POST /api/proposals/{id}/reject` → validates ≥10 char feedback, POSTs to n8n form (LIVE-FIRE).
  - Frontend: new Proposals page with pricing package cards, Review Queue tab, History tab,
    guardrail errors DISTINCTLY shown from reviewer issues, reject modal with min-10-char enforcement,
    "2nd Cycle" badge for proposals already revised once, expanded context_json, body_html preview.
- Phase 6 (Meetings form + n8n webhook — master build prompt Phase 2) - DONE:
  - Added Duration (minutes) and Meeting Title fields to the scheduling form.
  - Backend validates time format (HH:mm 24hr IST). 
  - If N8N_MEETINGS_WEBHOOK_URL configured, fires book-slot webhook with exact n8n form field names.
  - Double-booking protection still intact.
- Phase 7 (Reports/Analytics — master build prompt Phase 3) - DONE:
  - Added `GET /api/dashboard/analytics` endpoint with real pipeline funnel, outreach over time,
    leads by country/industry, meeting conversion rate, proposal quality, campaign performance.
  - Reports page now uses real data from this endpoint, falls back to mock data if unavailable.
  - Subtitles updated to indicate "Real pipeline data" vs sample data.
- Phase 8 (Outreach bug — master build prompt Phase 4) - Investigated:
  - ROOT CAUSE: Campaign creation works, n8n webhook fires and returns 200. Status stays "Queued"
    because n8n's outreach workflow (at UUID webhook path) either: (a) doesn't call back to update
    status, or (b) the workflow format doesn't match what n8n expects for email sending.
  - Fix applied: webhook now checks HTTP status code (returns False on 4xx/5xx), and if webhook
    fails, campaign status is set to "Failed" instead of staying "Queued". This gives honest feedback.
  - NOT live-fire tested (would send real emails). The n8n outreach workflow itself is outside our
    control — if it's not configured to send, campaigns will stay "Queued" on n8n side.

## Known gaps / not yet done
- Proposals approve/reject: NOT live-fire tested (sends real emails to real leads via n8n). 
  User must explicitly confirm before first real trigger.
- Meetings book-slot webhook: NOT live-fire tested (creates real Google Calendar event via n8n).
  User must explicitly confirm before first real trigger.
- Outreach campaign send: n8n webhook fires but emails may not be sent (n8n workflow may need
  configuration to match our JSON payload format `{request_id, user_id, subject, body, leads[]}`).
- `public.proposal_review_log` has 0 rows (n8n hasn't run against this DB). Proposals review
  queue will be empty until n8n's Proposal Agent processes real meetings.
- `smady.proposal_review_log.user_id_fkey` still points to `smady.users` — inserting for real
  users will fail. Use `public.proposal_review_log` for all new n8n-written data.
- Ownership gap: n8n doesn't populate user_id in `public.proposal_review_log`. Scoped via
  lead_email match. Consider having n8n set customer_id when meeting is booked via app.

## Testing status
- iteration_2.json: Auth (pbkdf2, signup/login/lockout), the /api 404 fix, ICP generation - PASS.
- iteration_3.json: Run History picker, pagination, Lead/ICP detail modals, Outreach (read-only),
  Meetings (booking + calendar) - PASS.
- Meeting conflict prevention (409) - self-tested via curl + screenshot, confirmed working.
- Outreach campaign send - NOT tested (would trigger real emails).
- Proposals page - smoke-tested via screenshot: pricing packages showing, review queue empty state,
  tabs working correctly. Approve/Reject NOT live-fire tested.
- Meetings new form (Duration+Title+n8n webhook) - smoke-tested via screenshot: all fields visible.
- Reports analytics endpoint - smoke-tested: real funnel/outreach/country/industry data rendering.

## Test credentials
- test@smady.ai / Test123456! (created by agent, no real data)

## Next up
1. Live-fire test Meetings book-slot webhook (creates real Google Calendar event — needs user confirmation).
2. Live-fire test Proposals approve/reject (sends real emails — needs explicit user confirmation per proposal).
3. Live-fire test Outreach campaign send (sends real emails — needs user confirmation).
4. n8n Proposal Agent needs to run against this DB to populate `public.proposal_review_log` with
   real proposals-for-review so the Proposals page review queue shows real data.
5. Verify n8n outreach webhook format matches what our backend sends (might need a test run).


## Completed (this session, Sep 2026)
- Phase 1 (Auth) - DONE, tested. Fixed pbkdf2 password hashing (was bcrypt-only, real prod
  users use pbkdf2$210000$salt$hash). Fixed frontend/.env /api suffix bug causing 404s on every
  API call (platform reset the env var; api.ts now appends /api itself, immune to future resets).
- Phase 2 (ICP + Leads) - DONE, tested with a real live n8n run.
  - ICP: real synchronous REST call to ICP Engine API (not a webhook), added required
    Business Stage/Priority fields to the form, mapped response into frozen UI + public.company_profiles.
  - Leads: real lead-management-V2 webhook + callback wired and live-tested (1 real lead:
    Sean Clark @ shoes.com). Added Run History picker, pagination (25/page), Lead/ICP detail
    modals (surfaces Lead Score/Priority/personalization hook/etc. not shown in the main table),
    ICP->Leads auto-prefill, enriched Excel export.
  - Found and fixed a real DB landmine: several smady.* FK constraints pointed at a stale,
    orphaned smady.users table instead of public.users - would have broken password reset,
    lead run history, and outreach campaigns for every real user. Fixed (NOT VALID, non-destructive).
- Phase 3 (Outreach) - partially done. Fixed recipient sourcing to read real
  public.lead_results (was reading the legacy/disconnected smady.leads table). Added
  "target a specific past execution" recipient option + reused Run History picker. Added a
  "Send All N to Outreach" bulk button on the Leads page (previously required selecting one row
  at a time). NOT live-tested - creating a campaign fires a REAL n8n webhook that sends real
  emails; deliberately held off pending explicit user go-ahead.
- Phase 4 (Meetings) - DONE, tested. Manual scheduling -> public.meetings was already wired;
  added double-booking prevention (409 + clear toast) since it was missing.
- Deployment docs (Vercel+Render split, and all-AWS) written per user request.

## Known gaps / not yet done
- Outreach: campaign send flow not yet live-fire tested (needs user confirmation before any real trigger).
- Outreach: outreach_emails/callback payload shape from n8n is unverified (built defensively,
  same pattern as leads, but not confirmed against a real n8n send).
- The n8n "Manual Meeting Scheduler" FORM url was inspected - it's a native n8n form, not
  something our app should POST to programmatically. Our own /meetings/schedule -> public.meetings
  is the correct integration point and is what's wired. Flagged, not blocking.
- Phase 5 (Proposals) - not started (user said "don't block earlier phases waiting for those details").
- Phase 6 (Reports/Dashboard) - not started; dashboard_router.py and mock Reports charts still
  read the legacy schema / mock data.

## Testing status
- iteration_2.json: Auth (pbkdf2, signup/login/lockout), the /api 404 fix, ICP generation - PASS.
- iteration_3.json: Run History picker, pagination, Lead/ICP detail modals, Outreach (read-only),
  Meetings (booking + calendar) - PASS. Minor non-blocking code-review notes (a11y aria-describedby
  on dialogs, non-atomic ICP upsert) - not yet applied, low priority.
- Meeting conflict prevention (409) - self-tested via curl + screenshot, confirmed working.
- Outreach campaign send - NOT tested (would trigger real emails).

## Next up (pending user go-ahead)
1. Live-fire test the Outreach campaign send (needs explicit confirmation - sends real emails).
2. Phase 5 (Proposals) integration.
3. Phase 6 (Dashboard/Reports) - migrate off legacy schema + mock chart data.

# SMADY — Backend Integration PRD & Progress

## Original problem statement
Wire the ~95%-complete, FROZEN frontend UI to the real FastAPI backend, n8n workflows, custom
auth, and AWS RDS Postgres database. 6 phases: Auth, ICP+Leads, Outreach, Meetings, Proposals,
Reports/Dashboard. Ground rule: no assumptions — inspect and ask before wiring anything unclear.

## Architecture
- React (Vite) frontend, FastAPI backend, AWS RDS Postgres (external, pre-existing).
- `public` schema = REAL data written by n8n + this app (users, customers, company_profiles,
  lead_results, run_status, meetings, proposal_results).
- `smady` schema = app-internal bookkeeping only (login_attempts, password_reset_tokens,
  icp_profiles, lead_runs, plus legacy leads/outreach_campaigns/outreach_emails still used by
  dashboard_router.py until Phase 6). See /app/DATA_MODEL.md for the full field-by-field map.
- Full page/table/column reference: /app/DATA_MODEL.md
- Deployment guides: /app/DEPLOY_VERCEL.md, /app/DEPLOY_AWS.md

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

# PHASE 5: EXECUTION PLAN - Production Testing

## Access Confirmed ✅

| Access Point | Status | Contact |
|--------------|--------|---------|
| N8N Executions Tab | ✅ YES | Can view workflow execution logs |
| Database Access | ✅ YES | AWS RDS credentials provided |
| Gmail Inbox | ✅ YES | Can verify campaign/proposal emails |
| Calendar Verification | ⚠️ PARTIAL | Can see meeting mail, timezone TBD |

---

## Critical Issue Found ⚠️

**N8N_PROPOSALS_WEBHOOK_URL is EMPTY**

```bash
# Current .env shows:
N8N_PROPOSALS_WEBHOOK_URL=
```

**This must be configured before Phase 5 can proceed.**

**Action:** What is the correct n8n webhook URL for proposals? 
- Should be similar to: `https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/{proposal-webhook-id}`
- Ask n8n admin OR check n8n UI: Proposals workflow → Webhook node → copy URL

---

## Database Credentials (Confirmed)

```bash
DB_HOST=smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Onaamika#1506
DB_SCHEMA=smady
DB_NAME=postgres  # (from PG_DATABASE=postgres)

# N8N Secrets
N8N_CALLBACK_SECRET=0ae44ca96b5093fcd70cdf5dd7f7c705
N8N_LEADS_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/lead-management-V2
N8N_MEETINGS_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/book-slot
N8N_OUTREACH_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/2e460161-9738-4b81-8d65-44780979541a
N8N_PROPOSALS_WEBHOOK_URL=???  ← MISSING

# Backend
PUBLIC_BACKEND_URL=https://smady.onrender.com
JWT_SECRET=894e717ca07b0a0e545fa8a637018659
```

---

## Phase 5 Test Execution Steps

### STEP 1: Verify Database Connection (5 min)

**Command:**
```bash
psql -h smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com \
     -U postgres \
     -d postgres \
     -p 5432 \
     -c "SELECT version();"
```

**Expected Output:**
```
PostgreSQL 13.x ...
```

**If fails:** Check firewall, check credentials

---

### STEP 2: Check Leads Table (5 min)

**Query:**
```sql
SELECT COUNT(*) as total_leads, 
       COUNT(DISTINCT user_id) as unique_users
FROM public.lead_results;
```

**Expected:** Shows count of leads in database

**Check enrichment fields:**
```sql
SELECT request_id, 
       user_id,
       jsonb_object_keys(leads[0]) as lead_fields
FROM public.lead_results 
WHERE leads IS NOT NULL 
LIMIT 1;
```

**Expected:** Shows fields like: `id`, `email`, `name`, `company`, `title`, `Lead Score`, `ICP Match`, etc.

---

### STEP 3: Check Meetings Table (5 min)

**Query:**
```sql
SELECT id, lead_name, lead_email, meeting_datetime, status, created_at
FROM public.meetings
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Shows recent meetings with:
- `meeting_datetime` in UTC format
- `status` = "scheduled" or "confirmed"

**Check timezone conversion:**
```sql
-- For a recent meeting, verify UTC storage
SELECT id,
       meeting_datetime AT TIME ZONE 'UTC' as utc_time,
       meeting_datetime AT TIME ZONE 'Asia/Kolkata' as ist_time
FROM public.meetings
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** 
- UTC time: `2026-09-16 09:00:00`
- IST time: `2026-09-16 14:30:00` (5:30 hours ahead)

---

### STEP 4: Check Proposals Table (5 min)

**Query:**
```sql
SELECT id, 
       meeting_id, 
       lead_email, 
       final_status, 
       guardrail_errors,
       created_at
FROM public.proposal_review_log
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Shows proposals with statuses:
- `Needs Review` (guardrails failed)
- `Sent` (guardrails passed)
- `Approved` (user approved manually)
- `Rejected` (user rejected + regenerating)

**Check ownership scoping:**
```sql
-- Verify lead_email matches user's leads
SELECT pr.lead_email, 
       pr.final_status,
       COUNT(lr.leads) as matching_lead_count
FROM public.proposal_review_log pr
LEFT JOIN public.lead_results lr 
  ON lr.leads->0->>'Email' = pr.lead_email
GROUP BY pr.lead_email, pr.final_status
LIMIT 5;
```

**Expected:** Shows proposals matched to user's leads via email

---

### STEP 5: Test Flow 1 - Lead Generation (15 min)

**In Frontend (https://smady.vercel.app):**
1. Navigate to **Leads page**
2. Click **"Generate Leads"** button
3. Select filters: Industries, Roles, Countries
4. Submit

**Monitor in N8N:**
1. Go to **Proposals workflow** (or leads.json)
2. Click **Executions** tab
3. Watch for new execution with status "Running"
4. Wait for completion (green checkmark)
5. Check webhook node logs:
   - Should show: `POST /api/leads/callback`
   - Should show: X-Callback-Secret header verified
   - Should show: Response 200 OK

**Check Database:**
```sql
-- Should see new row with status='success'
SELECT request_id, status, total_count, 
       JSON_ARRAY_LENGTH(leads) as enriched_count
FROM public.lead_results
ORDER BY created_at DESC
LIMIT 1;
```

**Check Frontend:**
- Leads page should display refreshed data
- Click on a lead to expand
- Verify enrichment fields visible: Lead Score, ICP Match, Industry, Title, etc.

---

### STEP 6: Test Flow 2 - Outreach Campaign (15 min)

**In Frontend:**
1. Go to **Leads page**
2. Select 3-5 leads
3. Click **"Create Campaign"**
4. Enter subject/body
5. Submit

**Monitor in N8N:**
1. Go to **Outreach workflow** (outreach.json)
2. Click **Executions** tab
3. Watch for new execution
4. Check webhook node:
   - Should receive FULL lead object (30+ fields)
   - Should see Lead Score, ICP Match in payload
   - NOT just: `{lead_id, email, name}`

**Check Gmail:**
1. Open Gmail inbox
2. Look for campaign emails (from noreply@gmail.com or similar)
3. Verify personalization:
   - Email contains lead's name ✓
   - Email contains company name ✓
   - Email contains personalized content ✓

**Check Database:**
```sql
-- Verify outreach_campaigns record created
SELECT id, subject, status, leads_count, sent_count
FROM public.outreach_campaigns
ORDER BY created_at DESC
LIMIT 1;
```

---

### STEP 7: Test Flow 3 - Meeting Scheduling (20 min)

**In Frontend:**
1. Go to **Leads page**
2. Select a lead
3. Click **"Schedule Meeting"** (or Meetings page)
4. Enter:
   - Date: Today or tomorrow
   - Time: **2:30 PM IST** (14:30)
   - Duration: 60 minutes
   - Title: "Demo"
   - Meeting Link: http://zoom.us/...
5. Submit

**Monitor in N8N:**
1. Go to **Meetings workflow** (meeting.json)
2. Check **Executions** tab for "book-slot" webhook
3. Verify webhook payload:
   - Meeting Date: `YYYY-MM-DD` format
   - Meeting Time: `14:30` (IST format)
   - Duration: `60`
4. Watch for email node execution (calendar invite sent)

**Check Database - Timezone Verification (CRITICAL):**
```sql
-- Connect to DB
psql -h smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com \
     -U postgres -d postgres

-- Query meeting times
SELECT id, 
       meeting_datetime as stored_utc,
       meeting_datetime AT TIME ZONE 'Asia/Kolkata' as display_ist,
       duration_minutes,
       status
FROM public.meetings
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
```
id  | stored_utc          | display_ist         | duration_minutes | status
1   | 2026-09-16 09:00:00 | 2026-09-16 14:30:00 | 60               | scheduled
```

**Verification:** 
- ✅ If IST time = 2:30 PM (14:30) and UTC time = 9:00 AM → CORRECT
- ❌ If UTC time ≠ IST time - 5:30 hours → TIMEZONE BUG

**Check Gmail:**
1. Open Gmail inbox
2. Look for calendar invite email
3. Verify time displayed as **2:30 PM** (NOT 9:00 AM, NOT wrong time)
4. Accept/decline to add to calendar

**Check Meeting Appears in UI:**
1. Frontend: Go to **Meetings page**
2. Should see new meeting with status "Scheduled"
3. Verify lead name and date display correctly

---

### STEP 8: Test Flow 4 - Proposal Generation (120 min - includes wait time)

**Option A: Manual Trigger (if n8n scheduler can be accelerated)**
1. Go to n8n Proposals workflow
2. Find the **Scheduler node**
3. Check if timing can be changed (instead of 3h, use 5 min for testing)
4. Run manually or trigger from Schedule node

**Option B: Wait for Scheduler (3 hours)**
1. After scheduling meeting in Step 7, note the timestamp
2. Add 3 hours
3. Come back at that time
4. Proceed with verification below

**Monitor Scheduler Execution:**
1. Go to **Proposals workflow** in n8n
2. Click **Executions** tab
3. Should see execution starting ~3h after meeting created
4. Watch logs for:
   - ✅ Fireflies API call (fetch transcript)
   - ✅ Claude API call (generate proposal)
   - ✅ Guardrail check (pass/fail)
   - ✅ Email send (if guardrails pass)
   - ✅ DB write to proposal_review_log

**Check Database:**
```sql
-- Verify proposal created
SELECT id, 
       meeting_id, 
       lead_email, 
       final_status,
       guardrail_errors,
       created_at
FROM public.proposal_review_log
ORDER BY created_at DESC
LIMIT 1;
```

**Expected statuses:**
- `Sent` = guardrails passed, email sent
- `Needs Review` = guardrails failed, awaiting manual approval

**Check Frontend:**
1. Go to **Proposals page**
2. Should see new proposal in list
3. Click to expand details
4. If status = "Needs Review":
   - [ ] Click **"Approve"** button
   - [ ] Verify n8n approve webhook fires (check n8n Executions)
   - [ ] Check Gmail for proposal email sent
   - [ ] Status updates to "Approved"
5. If status = "Sent":
   - [ ] Check Gmail for proposal email (already sent)
   - [ ] Status shows "Sent"

**Test Rejection Flow (if Needs Review):**
1. Click **"Reject & Request Revision"**
2. Enter feedback (min 10 characters)
3. Submit
4. Monitor n8n:
   - Should see regeneration workflow trigger
   - New proposal generated with feedback incorporated
   - Re-run guardrails
5. Check Gmail:
   - Should receive updated proposal email after regeneration

---

## Phase 5 Success Checklist

### Flow 1: Lead Generation ✅
- [ ] Leads generated in n8n
- [ ] Callback received by backend (check n8n webhook logs)
- [ ] DB updated with enriched data
- [ ] UI displays leads with 30+ enrichment fields

### Flow 2: Outreach ✅
- [ ] Campaign created
- [ ] N8N receives FULL lead objects (30+ fields, not truncated)
- [ ] Campaign emails sent (check Gmail)
- [ ] Emails have personalization (names, company, etc.)

### Flow 3: Meetings ✅
- [ ] Meeting scheduled
- [ ] DB stores time in UTC (meeting_datetime)
- [ ] **TIMEZONE CRITICAL:** UTC time = IST time - 5:30 hours
- [ ] Calendar invite sent with correct IST time
- [ ] Meeting appears in Meetings page

### Flow 4: Proposals ✅
- [ ] Scheduler fires 3h after meeting (check n8n Executions)
- [ ] Proposal generated via Claude
- [ ] Guardrail check runs
- [ ] Either auto-sent OR awaits review
- [ ] Approval/rejection works
- [ ] Regeneration cycle works

### Integration: All 4 Flows ✅
- [ ] Complete chain works: Leads → Outreach → Meeting → Proposal
- [ ] Data flows correctly through all systems
- [ ] N8N webhooks fire as expected
- [ ] Database records persist correctly
- [ ] UI updates reflect changes

---

## Critical Paths to Fix (If Any Fail)

### If Leads Don't Generate
```sql
-- Check if webhook URL is correct
SELECT * FROM public.lead_results LIMIT 1;
-- If empty: N8N_LEADS_WEBHOOK_URL may be wrong or unreachable
```

### If Outreach Payload Still Truncated
```
File to check: backend/routers/outreach_router.py line 82-89
Should be: recipient_leads = eligible  (NOT list comprehension)
```

### If Meeting Timezone Wrong
```sql
-- Debug timezone conversion
SELECT 
  NOW() as current_utc,
  NOW() AT TIME ZONE 'Asia/Kolkata' as current_ist,
  timezone_name() as db_timezone;
```

### If Proposals Don't Generate
```
1. Check if N8N_PROPOSALS_WEBHOOK_URL is configured (currently empty!)
2. Verify Scheduler node in n8n Proposals workflow is enabled
3. Check n8n Executions tab for errors
```

---

## Next Steps After Phase 5

**If ALL tests pass:** ✅ Production Ready
- Deploy to production with confidence
- All 4 flows verified end-to-end
- No critical bugs found

**If ANY test fails:** ⚠️ Fix Required
- Create bug report with:
  - Step that failed
  - Expected vs actual result
  - Database state at time of failure
  - N8N execution logs
  - Screenshot/error message
- Assign to appropriate team
- Re-test after fix deployed

---

## Appendix: Database Connection Commands

**Mac/Linux:**
```bash
psql -h smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com \
     -U postgres \
     -d postgres \
     -p 5432 \
     -c "SELECT * FROM public.lead_results LIMIT 1;"
```

**Windows (PowerShell):**
```powershell
$env:PGPASSWORD="Onaamika#1506"; `
psql -h smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com `
     -U postgres `
     -d postgres `
     -p 5432 `
     -c "SELECT * FROM public.lead_results LIMIT 1;"
```

**If psql not installed:**
Download: https://www.postgresql.org/download/

**Alternative: Use GUI Tool**
- pgAdmin (https://www.pgadmin.org)
- DBeaver (https://dbeaver.io)
- Configure connection with credentials above

---

## Summary

**Phase 5 is ready to execute with:**
- ✅ N8N Executions tab access
- ✅ Database credentials + access
- ✅ Gmail inbox access
- ✅ All webhook URLs configured (except proposals - needs confirmation)
- ✅ 8 detailed test steps covering all 4 flows

**Estimated Time:** 4-5 hours (includes 3h proposal scheduler wait)

**Blockers:** 
1. **N8N_PROPOSALS_WEBHOOK_URL is empty** - Need to configure
2. Calendar timezone verification - Can partially test (mail shows timezone correct or not)


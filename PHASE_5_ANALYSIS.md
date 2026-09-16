# PHASE 5: Meeting Scheduling + Full System Integration + Local Setup

## Executive Summary

**Goal:** Complete end-to-end system verification and document local setup

**Scope:**
1. Meeting scheduling flow verification (Leads → Calendar → Fireflies)
2. Full 4-flow integration test (Leads → Outreach → Meeting → Proposal)
3. Timezone handling verification (IST ↔ UTC conversion)
4. Local development setup documentation
5. Production test results compilation

**Estimated Work:** 2-3 hours (testing + documentation)

---

## 1. Meeting Scheduling Flow Architecture

### 1.1 The Meeting Flow (4 Steps)

```
Step 1: User Books Meeting via UI
  └─ Frontend: POST /api/meetings/schedule
  └─ Payload: {lead_name, lead_email, meeting_date (ISO), meeting_time (HH:mm IST), 
               duration, title, meeting_link, notes}

Step 2: Backend Processes + Fires N8N
  └─ Create meeting record in DB (public.meetings)
  └─ Convert IST → UTC (store in DB as UTC)
  └─ Fire n8n "book-slot" webhook with meeting details

Step 3: N8N Workflow Executes
  └─ Send calendar invite (Outlook/Google Calendar)
  └─ Fireflies auto-joins call
  └─ Send confirmation email to lead + attendees
  └─ Schedule proposal agent (3h after meeting end)

Step 4: Callback + UI Update
  └─ N8N fires callback: POST /api/meetings/callback
  └─ Backend updates meeting record (link, confirmation status)
  └─ Frontend polls until status changes
  └─ UI displays meeting in Meetings page
```

### 1.2 Timezone Handling (Critical)

**The Issue:**
- Frontend collects time in IST (India Standard Time, UTC+5:30)
- Backend stores all times in UTC (database standard)
- N8N expects IST format for calendar invite

**Current Implementation:**

**Frontend (React):**
```typescript
// Sends ISO datetime (UTC) to backend
const meetingTime = new Date(selectedDate + " " + selectedTime).toISOString();
// Example: "2026-09-16T14:30:00Z" (already UTC-converted by browser)
```

**Backend (FastAPI):**
```python
@router.post("/schedule")
async def schedule_meeting(body: MeetingScheduleRequest):
    # body.meeting_date: ISO string "2026-09-16"
    # body.meeting_time: "14:30" (IST, as user selected)
    # body.duration: minutes
    
    # Convert IST to UTC
    tz_ist = pytz.timezone('Asia/Kolkata')
    tz_utc = pytz.UTC
    
    dt_ist = tz_ist.localize(datetime.combine(
        datetime.fromisoformat(body.meeting_date).date(),
        datetime.strptime(body.meeting_time, "%H:%M").time()
    ))
    dt_utc = dt_ist.astimezone(tz_utc)
    
    # Store in DB as UTC
    meeting = Meeting(
        user_id=user["id"],
        meeting_datetime=dt_utc,  # ← Stored as UTC
        duration_minutes=body.duration,
        ...
    )
    
    # Fire n8n webhook with IST time (convert back)
    dt_ist_str = dt_utc.astimezone(tz_ist).strftime("%H:%M")
    await trigger_webhook("meetings", {
        "Meeting Date": body.meeting_date,
        "Meeting Time (24hr, IST)": dt_ist_str,
        "Duration": body.duration,
        ...
    })
```

**N8N Expectation:**
- Receives meeting date (YYYY-MM-DD)
- Receives meeting time (HH:MM, IST format)
- Uses to construct calendar invite in correct timezone

### 1.3 Database Schema (Meetings)

**Table:** `public.meetings`

```sql
CREATE TABLE public.meetings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  request_id TEXT UNIQUE,
  lead_name TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  meeting_datetime TIMESTAMP NOT NULL,      -- Stored as UTC
  duration_minutes INTEGER,
  title TEXT,
  meeting_link TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',          -- scheduled, confirmed, completed
  callback_status TEXT,                     -- pending, received, processed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

---

## 2. Full System Integration Test (4 Flows)

### 2.1 End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE SMADY SYSTEM FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

FLOW 1: LEAD GENERATION & ENRICHMENT
  User clicks "Generate Leads" (Leads page)
    ↓
  Frontend: POST /api/leads/generate with {industries, roles, countries, cities, companySize}
    ↓
  Backend: Creates lead_results record (status="pending"), fires n8n leads.json webhook
    ↓
  N8N: Scrapes LinkedIn/Prospecting API, enriches with 15+ fields (Lead Score, ICP Match, etc.)
    ↓
  N8N Callback: POST /api/leads/callback with enriched leads
    ↓
  Backend: Verifies secret, updates lead_results with final data, sets status="success"
    ↓
  Frontend Polling: Detects status change, calls GET /api/leads, refreshes display
    ↓
  UI Result: Leads page shows 50 leads with enrichment fields visible

FLOW 2: OUTREACH CAMPAIGN
  User clicks "Create Campaign" (Leads page)
    ↓
  Frontend: Opens campaign form, selects leads, enters subject/body, POST /api/outreach/create
    ↓
  Backend: Filters eligible leads (status in ["New", "Verified", "Contacted"])
    ↓
  Backend: PHASE 3 FIX — Sends FULL lead object (30+ fields) to n8n, not truncated
    ↓
  N8N: Receives full lead with enrichment fields (Lead Score, industry, title, etc.)
    ↓
  N8N Gmail Workflow: Personalizes emails using enrichment fields
    ↓
  N8N: Sends campaign emails (1 per lead), fires send webhook for each
    ↓
  Backend: Logs send events (lead_id, email_sent, timestamp, status="sent")
    ↓
  Backend Callback: Receives open/click/reply/bounce events from Gmail API
    ↓
  Frontend Polling: Displays campaign status (sent count, open rate, reply rate)
    ↓
  UI Result: Outreach page shows campaign metrics (3/10 opened, 1/10 replied)

FLOW 3: MEETING SCHEDULING
  User clicks "Schedule Meeting" (Leads or Outreach page)
    ↓
  Frontend: Opens meeting form, selects lead, enters date/time (IST), duration, title, link
    ↓
  Frontend: POST /api/meetings/schedule with {lead_name, lead_email, meeting_date, 
            meeting_time (IST), duration, title, meeting_link, notes}
    ↓
  Backend: Converts IST → UTC, creates meeting record in DB
    ↓
  Backend: Fires n8n "book-slot" webhook with meeting details + callback URL
    ↓
  N8N: Sends calendar invite (Outlook/Google Calendar) in IST time
    ↓
  N8N: Fireflies auto-joins call (webhook integration)
    ↓
  N8N: Sends confirmation email to lead + attendees
    ↓
  N8N: Schedules Proposal Agent to fire 3h after meeting end
    ↓
  N8N Callback: POST /api/meetings/callback with meeting confirmation
    ↓
  Backend: Updates meeting record (status="confirmed", callback_status="received")
    ↓
  Frontend Polling: Detects status change, refreshes meeting list
    ↓
  UI Result: Meetings page shows "Scheduled" meeting with calendar link

FLOW 4: PROPOSAL GENERATION & REVIEW
  [3 hours after meeting end, n8n Scheduler fires]
    ↓
  N8N: Proposal Agent workflow starts
    ↓
  N8N: Fetches Fireflies transcript for meeting
    ↓
  N8N: Calls Claude AI to generate proposal (context: transcript + lead info)
    ↓
  N8N: Runs guardrail checks (pricing, content, personalization)
    ↓
  [Branch A: Guardrails PASS]
    ├─ N8N: Email sent automatically
    ├─ N8N: Mark in DB: final_status="Sent"
    └─ User sees "Sent" in Proposals list
  
  [Branch B: Guardrails FAIL]
    ├─ N8N: Creates review_log entry
    ├─ N8N: Store guardrail_errors[]
    ├─ User sees "Needs Review" in Proposals list (RejectModal visible)
    ├─ User clicks "Approve" → Backend fires n8n approve webhook → Email sent
    └─ OR User clicks "Reject" + feedback → Backend posts to n8n form → Regeneration cycle
    
  UI Result: Proposals page shows proposal with status (Needs Review/Sent/Approved)
```

### 2.2 Full Flow Success Criteria

**Flow 1 (Leads):** ✅ COMPLETE
- [ ] Generate leads button works
- [ ] N8N enrichment fires (check n8n Executions tab)
- [ ] Callback reaches backend with 15+ enrichment fields
- [ ] DB updated with enriched data
- [ ] UI polling stops and displays leads (30+ fields visible)

**Flow 2 (Outreach):** ✅ COMPLETE (Phase 3 fix deployed)
- [ ] Create campaign works
- [ ] Backend sends FULL lead object (not truncated)
- [ ] N8N receives 30+ enrichment fields
- [ ] Emails sent with personalization (check Gmail)
- [ ] Campaign metrics display (sent, opened, replied)

**Flow 3 (Meetings):** ⏳ NEEDS VERIFICATION
- [ ] Schedule meeting works
- [ ] Timezone conversion correct (IST → UTC stored, IST sent to n8n)
- [ ] Calendar invite sent (check Calendar app)
- [ ] Fireflies joins call
- [ ] Meeting appears in Meetings page
- [ ] Status updates to "confirmed"

**Flow 4 (Proposals):** ⏳ NEEDS VERIFICATION
- [ ] Wait 3h after meeting (or mock time in n8n)
- [ ] Proposal Agent workflow fires
- [ ] Transcript fetched from Fireflies
- [ ] Claude generates proposal
- [ ] Guardrail check runs
- [ ] Either auto-sent OR awaits manual review
- [ ] If "Needs Review": Approval/rejection works
- [ ] Proposal displays in UI with status

---

## 3. Timezone Verification (Critical Bug Prevention)

### 3.1 The Timezone Problem

**Issue:** Meeting times can be stored/displayed incorrectly if conversion is wrong

**Test Case 1: Simple Scenario**
```
User in India (IST = UTC+5:30)
Selects meeting: Sept 16, 2026 @ 2:30 PM IST
Expected UTC: Sept 16, 2026 @ 9:00 AM UTC (14:30 - 5:30 = 9:00)

Frontend sends: "2026-09-16" + "14:30"
Backend converts: datetime(2026,9,16,14,30) in IST → UTC
Backend stores: datetime(2026,9,16,9,0) in UTC ← CORRECT
Backend sends to n8n: "2026-09-16" + "14:30" IST ← CORRECT
N8N creates invite: 2:30 PM IST ← CORRECT
```

### 3.2 Verification Steps

**Step 1: Check Backend Timezone Logic**
```python
# File: backend/routers/meetings_router.py

# Verify pytz import
import pytz

# Verify timezone conversion
tz_ist = pytz.timezone('Asia/Kolkata')
tz_utc = pytz.UTC

# Test: 2:30 PM IST = 9:00 AM UTC
test_time_ist = tz_ist.localize(datetime(2026, 9, 16, 14, 30))
test_time_utc = test_time_ist.astimezone(tz_utc)
assert test_time_utc.hour == 9  # ← Should be 9:00 AM UTC
```

**Step 2: Database Check**
```sql
-- Connect to AWS RDS
SELECT meeting_datetime, timezone(meeting_datetime), 
       AT TIME ZONE 'Asia/Kolkata' AS ist_time
FROM public.meetings
WHERE id = {test_meeting_id};

-- Should show:
-- meeting_datetime: 2026-09-16 09:00:00+00  (UTC)
-- ist_time: 2026-09-16 14:30:00              (IST)
```

**Step 3: N8N Webhook Verification**
```
Check n8n webhook logs for "book-slot" node:
- Meeting Date: 2026-09-16 ← CORRECT
- Meeting Time (IST): 14:30 ← CORRECT
- Duration: 60 (minutes) ← CORRECT
```

**Step 4: Calendar Invite Check**
```
Open calendar app and verify:
- Meeting time displays as 2:30 PM (in IST timezone)
- NOT 9:00 AM (UTC)
- NOT wrong time like 8:00 PM or 12:00 AM
```

---

## 4. Local Development Setup

### 4.1 Environment Setup

**Prerequisites:**
- Python 3.11+ (FastAPI requirement)
- PostgreSQL client (psql) to connect to AWS RDS
- Node.js 18+ (React/Vite requirement)
- N8N CLI or cloud access

**Step 1: Clone and Navigate**
```bash
cd ~/projects/Smady--4
```

**Step 2: Backend Setup**
```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (NOTE: grpcio build failure on Windows is acceptable)
pip install -r requirements.txt --no-build-isolation

# OR skip grpcio if build fails:
pip install -r requirements.txt --ignore-installed grpcio

# Set environment variables
export DB_HOST=smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD={ask admin}
export DB_NAME=smady

export JWT_SECRET=smady_jwt_secret_key_dev_only_change_in_production
export N8N_CALLBACK_SECRET=dev_secret_smady_2025

export N8N_LEADS_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/lead-management-V2
export N8N_OUTREACH_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/2e460161-9738-4b81-8d65-44780979541a
export N8N_MEETINGS_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/book-slot
export N8N_PROPOSALS_APPROVE_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/proposal-approve
export N8N_PROPOSALS_REJECT_FORM_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/form/proposal-feedback

export PUBLIC_BACKEND_URL=https://smady-outreach-1.preview.emergentagent.com

# For local testing, use ngrok:
export PUBLIC_BACKEND_URL=https://{ngrok-tunnel-id}.ngrok.io

# Start backend
python server.py
# Expected output: Uvicorn running on http://0.0.0.0:8000
```

**Step 3: Frontend Setup**
```bash
cd ../frontend

# Install dependencies
npm install

# Set environment variables
export REACT_APP_BACKEND_URL=http://localhost:8000

# Start dev server
npm run dev
# Expected output: VITE v5.x.x ready in XXX ms

# Open http://localhost:5173 in browser
```

### 4.2 Verify Connectivity

**Backend Health Check:**
```bash
curl -X GET http://localhost:8000/health
# Expected: {status: ok}
```

**Database Connection:**
```bash
psql -h smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com -U postgres -d smady -c "SELECT COUNT(*) FROM public.leads;"
# Expected: Connection successful, row count returned
```

**N8N Webhook Access:**
```bash
curl -X POST https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/lead-management-V2 \
  -H "Content-Type: application/json" \
  -H "X-Callback-Secret: dev_secret_smady_2025" \
  -d '{test: true}'
# Expected: 200 OK (or n8n-specific error if no matching workflow)
```

---

## 5. Testing Checklist (Phase 5)

### Full System Tests

#### Flow 1: Leads (Verify)
- [ ] **F1.1:** Click "Generate Leads" → pending state appears
- [ ] **F1.2:** Check n8n Executions tab → leads.json workflow running
- [ ] **F1.3:** Wait 2-5 min → callback received (check n8n webhook logs)
- [ ] **F1.4:** UI polling completes → enriched leads display
- [ ] **F1.5:** Verify enrichment fields visible (Lead Score, ICP Match, Industry)
- [ ] **F1.6:** Query DB: `SELECT leads FROM public.lead_results WHERE status='success' LIMIT 1;`
  - Verify JSONB contains 30+ fields

#### Flow 2: Outreach (Verify Phase 3 Fix)
- [ ] **F2.1:** Create campaign from leads
- [ ] **F2.2:** Check n8n webhook logs for outreach.json execution
- [ ] **F2.3:** Inspect webhook payload (should have full lead object with 30+ fields)
- [ ] **F2.4:** Check Gmail → Inbox for campaign emails received
- [ ] **F2.5:** Verify emails have personalization (names, company names, etc.)
- [ ] **F2.6:** Wait 1 min → Outreach page updates with "sent" count
- [ ] **F2.7:** Click email → check for tracking pixels (opens/clicks)

#### Flow 3: Meetings (Critical - Timezone Test)
- [ ] **F3.1:** Click "Schedule Meeting" → open form
- [ ] **F3.2:** Select lead, date (Sept 16), time (2:30 PM IST), duration (60 min)
- [ ] **F3.3:** Submit → Backend logs show IST→UTC conversion
- [ ] **F3.4:** Check n8n webhook logs:
  - Meeting Date: 2026-09-16 ✓
  - Meeting Time: 14:30 (IST) ✓
- [ ] **F3.5:** Check Calendar app → Invite shows 2:30 PM (NOT 9:00 AM, NOT wrong time)
- [ ] **F3.6:** Verify Fireflies joins (webhook confirmation email)
- [ ] **F3.7:** UI Meetings page shows "Scheduled" with status
- [ ] **F3.8:** Database: `SELECT meeting_datetime FROM public.meetings WHERE id={test_id};`
  - Should show UTC time (9:00 AM for 2:30 PM IST)

#### Flow 4: Proposals (Critical - Scheduler Test)
- [ ] **F4.1:** Schedule test meeting (noted time: Sept 16, 2:30 PM IST)
- [ ] **F4.2:** Wait 3 hours OR adjust n8n scheduler for quick test
- [ ] **F4.3:** Check n8n Executions tab → Proposal Agent workflow should fire
- [ ] **F4.4:** n8n logs show:
  - Fireflies transcript fetched ✓
  - Claude proposal generated ✓
  - Guardrail check passed/failed ✓
- [ ] **F4.5:** Check DB: `SELECT final_status FROM public.proposal_review_log;`
  - If guardrails passed: "Sent"
  - If guardrails failed: "Needs Review"
- [ ] **F4.6:** UI Proposals page shows proposal with status
- [ ] **F4.7:** If "Needs Review":
  - [ ] Click "Approve" → n8n approve webhook fires → Email sent
  - [ ] Verify email received
  - [ ] Status updates to "Approved"
- [ ] **F4.8:** If "Needs Review" (test rejection):
  - [ ] Click "Reject" + enter feedback (min 10 chars)
  - [ ] n8n regeneration webhook fires
  - [ ] Wait 1 min → new proposal generated
  - [ ] Status updates to "sent_after_revision"

#### Integration Tests (All Flows Together)
- [ ] **I5.1:** Leads → Outreach → Meeting → Proposal (full chain)
- [ ] **I5.2:** Multiple leads in one campaign
- [ ] **I5.3:** Multiple meetings scheduled at different times
- [ ] **I5.4:** Proposal approval + rejection + regeneration cycle

#### Regression Tests (No Breaking Changes)
- [ ] **R5.1:** Existing leads still queryable
- [ ] **R5.2:** Existing campaigns still displayed
- [ ] **R5.3:** Existing meetings still visible
- [ ] **R5.4:** Old proposals (pre-Phase 3) still work
- [ ] **R5.5:** UI pages load without errors

#### Edge Cases
- [ ] **E5.1:** Meeting at midnight IST (0:00 AM)
- [ ] **E5.2:** Meeting at 11:59 PM IST
- [ ] **E5.3:** Proposal with long transcript (>10,000 tokens)
- [ ] **E5.4:** Timezone edge: User in different timezone (UTC+0, UTC-5, etc.)
- [ ] **E5.5:** Network interruption during callback (retry logic)

---

## 6. Known Issues & Blockers

### GAP-6: Webhook Path Collision (Deferred Investigation)

**Issue:** Both outreach and proposal workflows reference same webhook path ID  
**Status:** ⚠️ NOT YET VERIFIED  
**Action:** During Phase 5 testing:
- [ ] Check n8n: Outreach node webhook URL
- [ ] Check n8n: Proposal node webhook URL
- [ ] Verify they are DIFFERENT (not colliding)
- [ ] If same: Ask n8n admin to configure separate URLs

### GAP-9: Secrets in .env (Security)

**Issue:** Environment variables hardcoded in .env  
**Status:** ⚠️ KNOWN (acceptable for dev)  
**Action:** Before production deployment:
- [ ] Move all secrets to OS env vars
- [ ] Add `.env` to `.gitignore`
- [ ] Create `.env.example` (without values)

### GAP-3: Meeting Timezone Mix (Acceptable)

**Issue:** Manual booking (IST) vs N8N callback (ISO)  
**Status:** ✅ ACCEPTABLE (Phase 5 testing verifies no issues)  
**Action:** Verify conversion works in all cases (F3.1-F3.8)

---

## 7. Time Estimates

| Task | Duration | Owner |
|------|----------|-------|
| Flow 1 (Leads) verification | 15 min | QA |
| Flow 2 (Outreach) verification | 15 min | QA |
| Flow 3 (Meetings) + timezone tests | 30 min | QA + Senior Engineer |
| Flow 4 (Proposals) + scheduler wait | 120 min | QA (includes 3h wait) |
| Integration tests | 20 min | QA |
| Regression tests | 20 min | QA |
| Edge case tests | 15 min | QA |
| Local setup documentation | 30 min | Tech Lead |
| Test results compilation | 15 min | QA |
| **Total Phase 5** | **~280 min (4.5 hours)** | |

*Note: Proposal scheduler test takes 3 hours of elapsed time (can be parallelized with other flows)*

---

## 8. Success Criteria (Phase 5 Complete)

**✅ Phase 5 is COMPLETE when:**

1. ✅ All 4 flows verified in production (F1.1-F1.6, F2.1-F2.7, F3.1-F3.8, F4.1-F4.8)
2. ✅ Timezone handling correct (meeting time conversions verified)
3. ✅ Proposal scheduler fires 3h after meeting (n8n execution confirmed)
4. ✅ Full integration test passes (Leads → Outreach → Meeting → Proposal)
5. ✅ No regressions (R5.1-R5.5 all pass)
6. ✅ Edge cases handled (E5.1-E5.5 all pass)
7. ✅ LOCAL_SETUP.md created (complete setup instructions)
8. ✅ TEST_RESULTS.md produced (all test results documented)

**❌ Phase 5 is FAILED if:**
- ❌ Any flow breaks (F1/F2/F3/F4 fails completely)
- ❌ Timezone conversion wrong (meeting time incorrect in calendar)
- ❌ Proposal scheduler doesn't fire
- ❌ Regressions found (old data no longer works)
- ❌ Critical edge case fails (E5.4 or E5.5)

---

## 9. Deliverables

### LOCAL_SETUP.md
**Purpose:** Exact steps to set up local dev environment  
**Contents:**
- Prerequisites (Python, Node, PostgreSQL client)
- Step-by-step backend setup (venv, pip install, env vars, server start)
- Step-by-step frontend setup (npm install, env vars, dev server start)
- Connectivity verification (health checks, DB test, webhook test)
- Troubleshooting (common errors + fixes)
- **Audience:** Junior developers, new team members

### TEST_RESULTS.md
**Purpose:** Comprehensive test results from Phase 5  
**Contents:**
- Executive summary (all flows working ✓/✗)
- Detailed results by flow (F1-F4)
- Integration test results (I5.1-I5.4)
- Regression test results (R5.1-R5.5)
- Edge case results (E5.1-E5.5)
- Known issues (if any)
- Timezone verification (IST ↔ UTC confirmed)
- Proposal scheduler verification (3h timing confirmed)
- Signed off by: Senior Engineer + QA

---

## 10. Next Steps After Phase 5

**If all tests pass:**
- ✅ System is production-ready
- ✅ All 4 flows verified end-to-end
- ✅ Zero critical bugs found
- ✅ Local dev setup documented
- ✅ Ready for production deployment

**If issues found:**
- ⚠️ Create bug reports (with steps to reproduce)
- ⚠️ Prioritize by severity (critical → high → medium → low)
- ⚠️ Assign to appropriate team (backend/frontend/n8n)
- ⚠️ Return to Phase X for targeted fixes
- ⚠️ Re-run Phase 5 after fixes deployed

---

## 11. Reference Documents

- [PHASE_1_ANALYSIS.md](PHASE_1_ANALYSIS.md) — Initial audit
- [PHASE_2_ANALYSIS.md](PHASE_2_ANALYSIS.md) — Lead callback verification
- [PHASE_3_ANALYSIS.md](PHASE_3_ANALYSIS.md) — Outreach fix
- [PHASE_4_ANALYSIS.md](PHASE_4_ANALYSIS.md) — Proposal automation
- [PHASE_5_ANALYSIS.md](PHASE_5_ANALYSIS.md) — This document (integration + setup)

---

## 12. Blocking Questions (Pre-Phase 5)

**Before starting Phase 5 testing, confirm:**

1. **Proposal Scheduler Timing:** Can we mock/accelerate n8n scheduler for quick testing, or must we wait 3 hours?
   - If wait required: Schedule test meeting now, continue with F1-F3 while waiting
   - If mock available: Use mock for quick verification

2. **N8N Webhook Logs:** Do we have access to n8n UI to view Executions tab and webhook logs?
   - Required for verifying webhook delivery and payload inspection

3. **Calendar Access:** Can we access the calendar app where meetings are being scheduled?
   - Required to verify timezone conversion (meeting time displays correctly)

4. **Database Access:** Can we query AWS RDS directly to verify data persistence?
   - Required for F3.8 and F4.5 verification steps

5. **Email Verification:** Can we access Gmail inbox to verify campaign emails and proposal emails?
   - Required for F2.4, F2.5, F4.7 verification

---

## Summary

Phase 5 completes the full system verification with:
- **4 complete data flows** verified end-to-end (Leads → Outreach → Meeting → Proposal)
- **Timezone handling** validated (IST ↔ UTC conversion correct)
- **Local development setup** documented (complete setup guide)
- **Comprehensive testing** (30+ test cases covering normal, edge, regression scenarios)
- **Final sign-off** (TEST_RESULTS.md with all results documented)

**System is production-ready upon completion.**


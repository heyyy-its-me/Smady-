# PHASE 4 ANALYSIS: Proposal Automation + Manual Review UI

## Executive Summary

**Goal:** Verify proposal scheduler fires 3h after meeting; ensure manual review flow is working end-to-end

**Current Status:** 
- ✅ Proposal scheduler exists (in n8n UI, not JSON exports)
- ✅ Manual review UI is fully wired on frontend
- ✅ Approval/rejection handlers exist in backend
- ⏳ Needs production verification (n8n scheduler execution, approval/rejection webhook delivery)

**Estimated Work:** 1-2 hours (testing only, no new code needed)

---

## 1. Proposal Flow Architecture

### 1.1 The 4-Step Proposal Workflow

```
Step 1: Meeting Occurs
  └─ Fireflies records meeting, generates transcript
  └─ Email sent to attendees with transcript link

Step 2: Proposal Agent Scheduled (3 hours later in n8n)
  └─ n8n Scheduler triggers workflow (timing: 3h after meeting end)
  └─ Fetches Fireflies transcript
  └─ Analyzes: call summary, pain points, customer objections
  └─ Generates proposal with AI using meeting context
  └─ Runs guardrail checks (pricing validation, content quality)
  └─ IF passes guardrails → auto-send email
  └─ IF fails guardrails → create review_log entry (Needs Review)

Step 3: Human Review (Optional, if guardrails failed)
  └─ User sees proposal in "Needs Review" queue in Proposals page
  └─ User clicks "Approve" → n8n sends email (email button webhook)
  └─ OR User clicks "Reject & Request Revision" → n8n regenerates

Step 4: Regeneration Cycle (Optional, if rejected)
  └─ User provides feedback (min 10 chars) 
  └─ Form POST to n8n rejection form
  └─ n8n regenerates proposal using feedback
  └─ Runs guardrails again
  └─ IF passes → auto-send email
  └─ IF fails → create new review_log entry
```

### 1.2 Key Component: The Scheduler

**Location:** N8N UI → Proposal workflow → Scheduler node  
**Timing:** 3 hours after meeting ends  
**Not in JSON:** The scheduler is configured in n8n UI, not exported to Proposal.json

**From user clarification (Phase 1):** "Scheduler already exists in n8n. Don't add code."

---

## 2. Data Flow Deep Dive

### 2.1 Meeting to Proposal Trigger

**Sequence:**
1. User schedules meeting via UI (`POST /api/meetings/schedule`)
2. Backend fires n8n "book-slot" webhook with meeting details
3. N8N Gmail workflow processes meeting email
4. N8N sends calendar invite (Fireflies auto-joins)
5. **3 hours after meeting end**: N8N Proposal Scheduler fires
6. Proposal Agent workflow starts:
   - Fetch transcript from Fireflies
   - Generate proposal via Anthropic Claude
   - Store in `public.proposal_review_log` (n8n-managed table)

### 2.2 Proposal Scheduler Node (N8N)

**Configuration (in n8n UI):**
- Trigger: Time-based scheduler
- Timing: 3 hours after meeting creation
- Action: Start Proposal Agent workflow
- Input: meeting_id, lead_email, meeting_transcript

**What it does:**
1. Queries Fireflies API for transcript (meeting_id matches)
2. Calls Claude to generate proposal (context: transcript + lead info)
3. Validates proposal against guardrails (pricing, content quality)
4. Either: sends email directly, OR creates review_log entry

**Why not in JSON:** N8N exports workflow nodes, not scheduler definitions. Scheduler is configured separately in UI.

### 2.3 Guardrail Check

**Before Sending Email:**
- ✅ Proposal price within pricing packages
- ✅ No profanity or off-brand language
- ✅ All required sections present (intro, benefits, pricing, CTA)
- ✅ Personalization hook present (references meeting context)

**If Guardrails Pass:**
- ✅ Email sent automatically (n8n Gmail node)
- ✅ Mark in DB: final_status="Sent"
- ✅ User sees "Sent" status in Proposals list

**If Guardrails Fail:**
- ⚠️ Email NOT sent
- ⚠️ Create review_log entry with: final_status="Needs Review"
- ⚠️ Store guardrail_errors[] list
- ⚠️ User sees in UI: "Needs Review" status with error details

---

## 3. Database Schema (Proposal Tables)

### 3.1 public.proposal_review_log (N8N-Managed)

**Purpose:** Proposals that failed guardrails or await user approval  
**Owner:** N8N Proposal Agent workflow  
**Written by:** N8N (n8n does NOT populate user_id/customer_id)

```sql
CREATE TABLE public.proposal_review_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Serial ID
  meeting_id TEXT,                        -- Fireflies transcript ID
  lead_email TEXT,                        -- Email from meeting attendee
  proposal_json JSONB,                    -- Generated proposal
  guardrail_errors TEXT[],                -- List of validation failures (if any)
  reviewer_approved BOOLEAN,              -- Manual approval flag
  reviewer_issues TEXT[],                 -- User feedback on rejection
  final_status TEXT,                      -- "Needs Review", "Approved", "Sent", "Rejected", "sent_after_revision"
  created_at TIMESTAMP DEFAULT NOW(),
  context_json JSONB,                     -- Meeting context (lead info, transcript summary)
  customer_id UUID,                       -- Added by approval handler
  user_id UUID,                          -- Added by approval handler
);
```

### 3.2 public.proposal_results (App-Generated, Fallback)

**Purpose:** Proposals generated via manual form (`POST /api/proposals/generate`)  
**Owner:** Backend (FastAPI)  
**Used when:** N8N proposal agent is unavailable (legacy/test flow)

### 3.3 Ownership Scoping (GAP-7 from Phase 1)

**Problem:** N8N doesn't populate user_id in proposal_review_log  
**Solution:** Scope by lead_email → match against user's lead_results rows

```python
async def _get_user_lead_emails(db: AsyncSession, user_id: str) -> set:
    """Return emails of all leads belonging to this user"""
    # Query public.lead_results where user_id = X
    # Extract all emails from leads[] JSONB array
    # Return as set for fast lookup
```

**Flow:**
1. User calls `GET /api/proposals`
2. Backend fetches all rows from proposal_review_log
3. For each row, check if row.lead_email matches user's leads
4. Only return matching rows to user

---

## 4. Frontend Proposal Review UI

### 4.1 Proposals Page Components

**Location:** [frontend/src/pages/Proposals.tsx](frontend/src/pages/Proposals.tsx)

**Components:**
- **StatusPill:** Shows status badge (Needs Review, Sent, Approved, Rejected)
- **RejectModal:** Feedback form (min 10 chars, matches n8n form validation)
- **ProposalCard:** Displays proposal with expandable details
- **ActionButtons:** Approve / Reject & Revise

### 4.2 Approval Flow (Frontend)

```typescript
const approveProposal = async (id: string | number) => {
  try {
    // POST /api/proposals/{id}/approve
    // Returns: {message, meeting_id, n8n_status}
    // If n8n_status=200: Email sent by n8n
    // If n8n_status=404: N8N workflow inactive, marked locally as Approved
    await api.post(`/proposals/${id}/approve`);
    toast.success("Proposal approved and sent");
    await refreshProposals();  // Reload from DB
  } catch (e) {
    toast.error(formatApiError(e));
  }
};
```

### 4.3 Rejection Flow (Frontend)

```typescript
const rejectProposal = async (id: string | number, feedback: string) => {
  try {
    // POST /api/proposals/{id}/reject
    // Body: {feedback: "...at least 10 chars..."}
    // N8N webhook receives form POST with: {"Meeting ID": id, "Feedback": feedback}
    // N8N triggers regeneration workflow
    await api.post(`/proposals/${id}/reject`, { feedback });
    toast.success("Feedback submitted. N8N will regenerate...");
    await refreshProposals();
  } catch (e) {
    toast.error(formatApiError(e));
  }
};
```

---

## 5. Backend Approval/Rejection Handlers

### 5.1 POST /api/proposals/{proposal_ref}/approve

**Source:** [backend/routers/proposals_router.py](backend/routers/proposals_router.py#L222)

**Flow:**
1. Accept proposal_ref (integer id, UUID, or meeting_id string)
2. Resolve to meeting_id
3. Call n8n approve webhook:
   ```
   GET {N8N_PROPOSALS_APPROVE_URL}?meeting_id={meeting_id}
   ```
4. If webhook returns 200:
   - N8N sends email
   - Return: {message: "Proposal approved and sent", n8n_status: 200}
5. If webhook returns 404:
   - N8N workflow inactive
   - Mark locally as "Approved"
   - Return: {message: "...(n8n inactive)...", n8n_status: 404}

**Environment Variable:**
```bash
N8N_PROPOSALS_APPROVE_URL=https://n8n.example.com/webhook/proposal-approve
```

### 5.2 POST /api/proposals/{proposal_ref}/reject

**Source:** [backend/routers/proposals_router.py](backend/routers/proposals_router.py#L303)

**Flow:**
1. Accept proposal_ref + feedback (min 10 chars)
2. Resolve to meeting_id
3. POST to n8n rejection form:
   ```
   POST {N8N_PROPOSALS_REJECT_FORM_URL}
   Content-Type: application/x-www-form-urlencoded
   
   Meeting ID={meeting_id}&Feedback={feedback}
   ```
4. N8N form validation + regeneration triggered
5. If form returns 200:
   - Return: {message: "Feedback submitted — n8n will regenerate", n8n_status: 200}
6. If form returns error:
   - Mark locally as "Rejected"
   - Return: {message: "...(n8n inactive)...", n8n_status: error_code}

**Environment Variables:**
```bash
N8N_PROPOSALS_REJECT_FORM_URL=https://n8n.example.com/form/proposal-feedback
```

---

## 6. Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Meeting Scheduled                                                  │
│ User books meeting via UI → Backend fires n8n webhook → Fireflies records  │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐            ┌────────────────────┐
        │  N8N CLOUD        │            │  FIREFLIES         │
        │  Gmail Workflow   │            │  (Transcript)      │
        │  - Send invite    │            │                    │
        │  - Auto join      │            │  Records meeting   │
        └───────────────────┘            └────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
        ┌─────────────────────────────────────────────────┐
        │  STEP 2: [SCHEDULER] 3 HOURS LATER              │
        │  N8N Scheduler Node Fires                       │
        └─────────────────────────────────────────────────┘
                            │
                            ▼
        ┌─────────────────────────────────────────────────┐
        │  N8N PROPOSAL AGENT WORKFLOW                    │
        │  1. Fetch Fireflies transcript                  │
        │  2. Generate proposal (Claude AI)               │
        │  3. Run guardrails check                        │
        │  ├─ IF PASS → Auto-send email                  │
        │  │            Write: final_status="Sent"        │
        │  └─ IF FAIL → Store for review                 │
        │              Write: final_status="Needs Review" │
        │              Fill: guardrail_errors[]           │
        └─────────────────────────────────────────────────┘
                            │
                            ▼
        ┌─────────────────────────────────────────────────┐
        │  PostgreSQL: public.proposal_review_log         │
        │  ├─ Row created by n8n                          │
        │  ├─ If guardrails failed: final_status=Needs... │
        │  └─ If guardrails passed: final_status=Sent    │
        └─────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    ┌──────────────┐              ┌─────────────────┐
    │ STEP 3a:     │              │ STEP 3b:        │
    │ APPROVED     │              │ NEEDS REVIEW    │
    │              │              │ (Failed checks) │
    │ Auto-sent    │              │                 │
    │ (guardrails  │              │ → User sees in  │
    │  passed)     │              │   Proposals UI  │
    └──────────────┘              └─────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
                  ┌─────────────┐                      ┌──────────────┐
                  │ User Clicks │                      │ User Clicks  │
                  │ "Approve"   │                      │ "Reject" +   │
                  │             │                      │ feedback     │
                  └─────────────┘                      └──────────────┘
                        │                                     │
          ┌─────────────▼─────────────────────────────────────▼─────────┐
          │  BACKEND                                                     │
          │  POST /api/proposals/{id}/approve                           │
          │  POST /api/proposals/{id}/reject                            │
          │  ├─ Resolve meeting_id                                      │
          │  ├─ Call n8n webhook (approve/reject form)                  │
          │  ├─ Update DB: final_status = "Approved" / "Rejected"       │
          │  └─ Return status to UI                                     │
          └─────────────┬────────────────────────────────────────────────┘
                        ▼
          ┌─────────────────────────────────────────┐
          │  N8N WEBHOOK                            │
          │  ├─ Approve: GET ?meeting_id=...        │
          │  │           Sends email                │
          │  └─ Reject:  POST rejection form        │
          │             Triggers regeneration       │
          └─────────────────────────────────────────┘
```

---

## 7. Testing Checklist

### Unit Tests (Local)

- [ ] **U7.1:** Mock n8n approve webhook, verify GET call with meeting_id
- [ ] **U7.2:** Mock n8n reject form, verify POST with form data
- [ ] **U7.3:** Verify feedback validation (min 10 chars)
- [ ] **U7.4:** Verify proposal scoping by lead_email
- [ ] **U7.5:** Verify proposal card renders with all fields

### Integration Tests (Production)

- [ ] **I7.1:** Schedule test meeting (verify calendar invite sent)
- [ ] **I7.2:** Wait 3 hours (or mock time in n8n scheduler)
- [ ] **I7.3:** Verify Proposal Agent workflow executed in n8n UI
- [ ] **I7.4:** Check n8n logs: transcript fetched successfully
- [ ] **I7.5:** Check n8n logs: proposal generated (Claude call succeeded)
- [ ] **I7.6:** Verify proposal_review_log row created in DB
- [ ] **I7.7:** Load Proposals page → see proposal in review queue
- [ ] **I7.8:** Click "Approve" → verify n8n approve webhook fired
- [ ] **I7.9:** Verify email sent (check Gmail inbox)
- [ ] **I7.10:** Click "Reject" + feedback → verify n8n regeneration triggered

### Regression Tests

- [ ] **R7.1:** Existing meetings not affected by Phase 4 changes
- [ ] **R7.2:** Non-guardian proposals still work (legacy app proposals)
- [ ] **R7.3:** Approval/rejection with n8n workflow inactive (fallback mode)
- [ ] **R7.4:** Proposal list sorting (most recent first)
- [ ] **R7.5:** Pagination for large proposal counts

### Edge Cases

- [ ] **E7.1:** Proposal with missing guardrail_errors (null)
- [ ] **E7.2:** Proposal with multiple revision cycles (is_revision flag)
- [ ] **E7.3:** User with no leads (should see all proposals)
- [ ] **E7.4:** Approval/rejection after meeting_id not found

---

## 8. Success Criteria

**Phase 4 is COMPLETE when:**

1. ✅ Scheduler verification: Confirm Proposal Agent fires 3h after meeting (check n8n UI Executions tab)
2. ✅ Transcript fetch: Verify Fireflies transcript retrieved successfully (check n8n logs)
3. ✅ Proposal generation: Confirm Claude proposal generated (check n8n logs)
4. ✅ Guardrail check: Proposal either auto-sent OR flagged for review
5. ✅ Manual review: Proposal appears in UI with "Needs Review" status
6. ✅ Approval: Click "Approve" → email sent via n8n webhook
7. ✅ Rejection: Click "Reject" + feedback → n8n regeneration triggered
8. ✅ Revision cycle: Revised proposal appears with "Sent (Revised)" status
9. ✅ All I7.x tests pass (production integration)
10. ✅ No regressions (R7.x tests pass)

**Phase 4 is FAILED if:**
- ❌ Scheduler doesn't fire (no execution in n8n UI after 3h)
- ❌ Transcript not fetched (n8n error log shows Fireflies API error)
- ❌ Proposal not generated (Claude call failed)
- ❌ Guardrail errors prevent storage to DB
- ❌ Proposal doesn't appear in UI
- ❌ Approve/reject webhooks don't fire
- ❌ Email not sent

---

## 9. Known Gaps

### GAP-6: Webhook Path Collision (Deferred)

**Issue:** Both outreach and proposal workflows share the same webhook path

**Current State:** ⚠️ NOT YET VERIFIED  
**Action:** Phase 5 — Will clarify which n8n node(s) are affected

**Impact:** Low (each workflow has unique URL, collision may not occur)

---

## 10. Environment Variables Required

**For Approval/Rejection:**
```bash
N8N_PROPOSALS_APPROVE_URL=https://n8n.example.com/webhook/proposal-approve
N8N_PROPOSALS_REJECT_FORM_URL=https://n8n.example.com/form/proposal-feedback
```

**For Scheduler Trigger:**
```bash
N8N_MEETINGS_WEBHOOK_URL=https://n8n.example.com/webhook/book-slot
```

---

## 11. Time Estimate

| Task | Duration |
|------|----------|
| Verify scheduler fires (n8n UI) | 15 min |
| Check transcript fetch logs | 10 min |
| Run full approval flow (I7.x tests) | 30 min |
| Run rejection + regeneration | 15 min |
| Regression tests (R7.x) | 20 min |
| **Total Phase 4** | **~90 min (1.5 hours)** |

---

## 12. Handoff Notes

**No Code Changes Needed**  
All proposal automation infrastructure already exists:
- ✅ Scheduler configured (n8n UI)
- ✅ Approval/rejection handlers (backend routes)
- ✅ Manual review UI (frontend components)
- ✅ Database schema (proposal_review_log)

**Work is 100% Testing/Verification**
- Verify end-to-end flow
- Test approval/rejection webhooks
- Monitor n8n scheduler execution

---

## 13. Blocking Question from User (Phase 1)

**Q: Why is proposal workflow incomplete?**  
**A:** Proposal scheduler exists in n8n UI (not in JSON exports). Don't add code.  
**Status:** ✅ Clarification received; no code changes needed

---

## Related Gaps

**Fixed by previous phases:**
- GAP-1: Lead enrichment (Phase 2 verified)
- GAP-2: Outreach payload (Phase 3 fixed)

**Verified in Phase 4:**
- GAP-3: Meeting timezone mix (will check in Phase 5)
- GAP-5: Manual review UI (already wired, Phase 4 verifies)
- GAP-6: Webhook collision (investigate during Phase 4)
- GAP-7: Proposal ownership (email-based scoping, Phase 4 verifies)

---

## 14. Next Phase

**Phase 5: Meeting Scheduling + Full System Integration + Local Setup**
- Verify meeting booking works end-to-end
- Test all 4 flows together (Leads → Outreach → Meeting → Proposal)
- Create LOCAL_SETUP.md
- Produce TEST_RESULTS.md


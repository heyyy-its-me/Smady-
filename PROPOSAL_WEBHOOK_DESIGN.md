# Proposal Webhook Design & Implementation

**Date**: 2026-09-16  
**Status**: READY FOR IMPLEMENTATION  
**Version**: 1.0

---

## Executive Summary

The Smady proposal flow requires a **webhook callback** from N8N to notify the backend when proposals are generated, ready for review, or updated. This webhook will:

1. **Receive proposal data** from N8N after proposal generation completes (including guardrail checks and AI review)
2. **Store/update** the proposal in `public.proposal_review_log` with full user/lead association
3. **Enable UI display** via the existing `/api/proposals` endpoint (already scopes proposals to authenticated user)
4. **Support manual review flow**: User sees "Needs Review" proposals → clicks Accept/Reject → triggers corresponding N8N workflows

---

## Database Architecture

### Proposal Tracking Tables

**Location**: PostgreSQL on AWS RDS (smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com)

#### 1. `public.proposal_review_log` (N8N-managed proposals)
```
id              INTEGER              PRIMARY KEY (auto-increment)
meeting_id      TEXT                 NOT NULL (link to meetings.id)
user_id         UUID                 NOT NULL (user who scheduled the meeting)
customer_id     UUID                 (organization level tracking)
lead_email      TEXT                 NOT NULL (for verification)
lead_name       TEXT
company         TEXT
proposal_json   JSONB                (generated proposal content)
guardrail_errors ARRAY              (validation failures, if any)
reviewer_approved BOOLEAN            (admin override)
reviewer_issues ARRAY                (admin feedback)
final_status    TEXT                 ("Needs Review", "Sent", "Approved", "Rejected", "sent_after_revision")
context_json    JSONB                (meeting context, lead info snapshot)
created_at      TIMESTAMP            (when proposal generated)
updated_at      TIMESTAMP            (last status update)
```

#### 2. `smady.proposal_review_log` (App-managed copy for auditing)
Same structure as public.proposal_review_log, kept in sync for audit trail.

#### 3. `public.proposal_results` (Legacy app-generated proposals)
Used for backward compatibility; same structure as proposal_review_log but without meeting_id link.

---

## Webhook Specification

### URL & Method
```
POST https://app-backend-url/api/proposals/webhook
Headers:
  X-Callback-Secret: 0ae44ca96b5093fcd70cdf5dd7f7c705
  Content-Type: application/json
```

### Request Payload (from N8N)

N8N must send this payload after proposal generation:

```json
{
  "request_id": "uuid",
  "user_id": "uuid",
  "customer_id": "uuid",
  "meeting_id": "fireflies_transcript_id",
  "lead_email": "prospect@example.com",
  "lead_name": "John Doe",
  "company": "ACME Corp",
  "proposal_json": {
    "subject": "Proposal for ACME Corp - Q4 2026 Services",
    "body_html": "<html>...</html>",
    "package_selected": "Enterprise",
    "quoted_price": 50000,
    "valid_until": "2026-10-16"
  },
  "guardrail_errors": [],
  "final_status": "Needs Review",
  "context_json": {
    "meeting_date": "2026-09-20T10:00:00Z",
    "transcript_summary": "Customer interested in Q4 scope expansion",
    "lead_score": "A+",
    "icp_match": "95%"
  }
}
```

### Response (200 OK)
```json
{
  "message": "Proposal stored successfully",
  "proposal_id": 42,
  "user_id": "uuid",
  "final_status": "Needs Review",
  "stored_at": "2026-09-16T12:34:56Z"
}
```

---

## Implementation Steps

### Step 1: Create Webhook Endpoint in Backend

**File**: `backend/routers/proposals_router.py`

Add new endpoint (pseudo-code, to be implemented):

```python
@router.post("/webhook")
async def proposal_callback(
    body: dict,
    x_callback_secret: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Receive proposal callback from N8N.
    
    Validates X-Callback-Secret, then stores/updates proposal_review_log with:
    - user_id: directly from N8N (links to user who scheduled the meeting)
    - proposal_json: full proposal content
    - final_status: initial status from N8N (typically "Needs Review")
    - lead_email: for verification and UI filtering
    - guardrail_errors: any validation issues from N8N guardrails
    
    Response enables frontend to poll /api/proposals until new proposal appears.
    """
    # 1. Verify webhook secret
    verify_callback_secret(x_callback_secret, os.environ.get("N8N_CALLBACK_SECRET"))
    
    # 2. Extract fields from payload
    user_id = body.get("user_id")
    meeting_id = body.get("meeting_id")
    proposal_json = body.get("proposal_json")
    final_status = body.get("final_status", "Needs Review")
    
    # 3. Insert/update proposal_review_log
    stmt = insert(public_proposal_review_log).values(
        user_id=user_id,
        meeting_id=meeting_id,
        lead_email=body.get("lead_email"),
        lead_name=body.get("lead_name"),
        company=body.get("company"),
        proposal_json=proposal_json,
        guardrail_errors=body.get("guardrail_errors", []),
        final_status=final_status,
        context_json=body.get("context_json"),
        customer_id=body.get("customer_id"),
        created_at=datetime.utcnow(),
    ).on_conflict_do_update(
        index_elements=["meeting_id"],
        set_=dict(
            proposal_json=proposal_json,
            final_status=final_status,
            guardrail_errors=body.get("guardrail_errors"),
            updated_at=datetime.utcnow(),
        )
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "message": "Proposal stored successfully",
        "proposal_id": result.inserted_primary_key[0],
        "user_id": user_id,
        "final_status": final_status,
        "stored_at": datetime.utcnow().isoformat(),
    }
```

### Step 2: Configure Environment Variables

**File**: `.env` (backend)

```bash
# Existing
N8N_CALLBACK_SECRET=0ae44ca96b5093fcd70cdf5dd7f7c705
N8N_LEADS_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/lead-management-V2
N8N_OUTREACH_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/2e460161-9738-4b81-8d65-44780979541a
N8N_MEETINGS_WEBHOOK_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/book-slot

# NEW
N8N_PROPOSALS_WEBHOOK_URL=https://YOUR_BACKEND_URL/api/proposals/webhook
N8N_PROPOSALS_APPROVE_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/proposal-approve
N8N_PROPOSALS_REJECT_FORM_URL=https://n8n-smady-adgtdkg5hvacf7fs.canadacentral-01.azurewebsites.net/webhook/proposal-feedback
```

### Step 3: Update N8N Proposal Workflow

**N8N Workflow**: `Proposals.json` → Webhook node (final step)

Configuration:
```
Method: POST
URL: ${env.N8N_PROPOSALS_WEBHOOK_URL}
Authentication: 
  - Header "X-Callback-Secret" = ${env.N8N_CALLBACK_SECRET}
Body: 
  {
    "request_id": "{{ $node['Generate Request ID'].json.request_id }}",
    "user_id": "{{ $node['Get Meeting Context'].json.user_id }}",
    "customer_id": "{{ $node['Get Meeting Context'].json.customer_id }}",
    "meeting_id": "{{ $trigger.body.meeting_id }}",
    "lead_email": "{{ $node['Get Lead Details'].json.email }}",
    "lead_name": "{{ $node['Get Lead Details'].json.name }}",
    "company": "{{ $node['Get Lead Details'].json.company }}",
    "proposal_json": "{{ $node['Claude AI - Generate Proposal'].json }}",
    "guardrail_errors": "{{ $node['AI Guardrail Validator'].json.errors || [] }}",
    "final_status": "Needs Review",
    "context_json": "{{ $node['Get Meeting Context'].json }}"
  }
```

---

## Frontend Integration

### User Experience Flow

```
1. User logs in → Frontend loads /api/proposals
2. Backend scopes proposals to user via:
   - proposal_review_log.user_id = authenticated user.id
   - OR lead_email in authenticated user's lead_results
3. Frontend displays proposals with status badges:
   - "Needs Review" → Show Accept/Reject buttons
   - "Sent" → Show confirmation (email sent)
   - "Approved" → Show confirmation (email sent)
   - "Rejected" → Show regeneration pending
   - "sent_after_revision" → Show revised proposal status
4. User clicks "Accept":
   - POST /api/proposals/{proposal_id}/approve
   - Backend calls N8N approve webhook
   - N8N sends email with proposal
   - Status updates to "Sent"
5. User clicks "Reject":
   - Opens modal with feedback form
   - POST /api/proposals/{proposal_id}/reject with feedback
   - Backend calls N8N reject webhook
   - N8N regenerates proposal with feedback
   - Scheduled to callback webhook again after 3h
   - Status updates to "sent_after_revision"
```

### Polling Implementation

Frontend's `smartPoll()` (already exists in AppDataContext):

```typescript
// After user generates leads
setProposalPolling(true);
smartPoll(`/api/proposals`, 
  (data) => {
    // Stop if new "Needs Review" proposals found
    if (data.review_queue?.length > 0 && 
        data.review_queue.some(p => p.final_status === "Needs Review")) {
      return true; // Stop polling
    }
    return false; // Keep polling
  },
  { 
    intervalMs: 20000,  // Initial 20s
    maxDurationMs: 14400000 // 4 hours max (proposal gen + 3h scheduler)
  }
);
```

---

## Security Considerations

### 1. Webhook Secret Verification ✓
- All N8N webhooks must include `X-Callback-Secret` header
- Backend verifies against `N8N_CALLBACK_SECRET` environment variable
- Secret stored in OS environment variables (NOT in .env for production)

### 2. User Association ✓
- `user_id` included in N8N payload (from meeting context)
- Backend stores directly in proposal_review_log
- Frontend scopes queries to authenticated user.id
- No unauthenticated user can see another user's proposals

### 3. Lead Email Verification ✓
- Webhook payload includes `lead_email`
- Backend could verify email belongs to user's lead_results (optional extra check)
- Prevents proposals from being associated with wrong users

### 4. Meeting ID Validation ✓
- `meeting_id` should be verified to exist in meetings table before storing
- Ensures proposals are only created for actual scheduled meetings

---

## Webhook Name Strategy

Following Smady's naming convention:

| Flow | N8N Workflow | Webhook Path | Purpose |
|------|--------------|--------------|---------|
| Leads | leads.json | `/webhook/lead-management-V2` | Receive enriched leads from lead agent |
| Outreach | outreach.json | `/webhook/2e460161-9738-4b81-8d65-44780979541a` | Notify of campaign execution |
| Meetings | meeting.json | `/webhook/book-slot` | Receive scheduled meeting confirmation |
| **Proposals** | **Proposal.json** | **/api/proposals/webhook** | **Receive generated proposal for review** |
| **Proposals (Approve)** | **Proposal.json** | **/webhook/proposal-approve** | **N8N: Handle user approval** |
| **Proposals (Reject)** | **Proposal.json** | **/webhook/proposal-feedback** | **N8N: Handle user rejection + regeneration** |

**Rationale**: 
- Leads, Outreach, Meetings webhooks use N8N-style paths (`/webhook/...`)
- Proposals callback uses app API path (`/api/proposals/webhook`) for consistency with other app endpoints
- Separate approval/rejection paths allow N8N to route responses independently

---

## Testing Strategy

### Phase 5 Proposal Testing Steps

**STEP 8: Verify Proposal Webhook**

1. Create test proposal in N8N (manual trigger or via meeting)
2. Verify webhook payload reaches backend:
   ```bash
   tail -f /var/log/app/proposals.log | grep "webhook"
   ```
3. Query database to confirm storage:
   ```sql
   SELECT id, meeting_id, user_id, lead_email, final_status, created_at
   FROM proposal_review_log
   ORDER BY created_at DESC LIMIT 3;
   ```
4. Frontend test:
   - Login as user
   - GET /api/proposals
   - Confirm newly generated proposal appears with "Needs Review" status
   - Verify only proposals for user's leads display
5. Test Accept flow:
   - Click Accept button
   - Verify N8N approve webhook called (check N8N Executions)
   - Confirm email received
   - Verify final_status updates to "Sent"
6. Test Reject flow:
   - Click Reject button
   - Submit feedback (>10 chars)
   - Verify N8N reject webhook called
   - Confirm regeneration triggered (check N8N Executions)
   - Wait for callback webhook to fire again
   - Verify final_status updates to "sent_after_revision"

---

## Migration from Testing to Production

1. **Secrets**: Move N8N_CALLBACK_SECRET and N8N webhook URLs to AWS Secrets Manager
2. **Logging**: Add structured logging for all webhook events (user_id, proposal_id, status transitions)
3. **Monitoring**: Alert on webhook timeouts or failures (PagerDuty/DataDog)
4. **Backup**: Weekly export of proposal_review_log to S3 for audit trail
5. **Documentation**: Generate API docs for N8N team with example payloads

---

## Files to Create/Modify

- ✅ **c/Users/Ad54333/Downloads/Smady--4/Smady--4/backend/routers/proposals_router.py** 
  - Add `/api/proposals/webhook` POST endpoint
  
- ✅ **.env**
  - Update N8N_PROPOSALS_WEBHOOK_URL
  - Confirm N8N_PROPOSALS_APPROVE_URL
  - Confirm N8N_PROPOSALS_REJECT_FORM_URL

- ✅ **N8N UI** (Manual configuration)
  - Update Proposals workflow → Webhook node
  - Set callback URL to N8N_PROPOSALS_WEBHOOK_URL
  - Add X-Callback-Secret header

---

## Success Criteria

- ✅ Webhook endpoint created and deployed
- ✅ N8N Proposals workflow configured to call webhook
- ✅ Proposal data persists in proposal_review_log with user association
- ✅ Frontend displays user-scoped proposals in UI
- ✅ Accept/Reject flows trigger N8N workflows
- ✅ Status updates visible in real-time (smartPoll)
- ✅ All 4 data flows pass Phase 5 integration testing

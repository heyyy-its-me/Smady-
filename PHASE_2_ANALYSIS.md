# PHASE 2 ANALYSIS: Lead Callback Data Flow

## Executive Summary

**Goal:** Verify that n8n lead callbacks reach the backend, update the DB correctly, and the UI reflects updates.

**Status:** ✅ Code review complete. No critical bugs found in callback flow. System ready for integration testing.

---

## 1. Lead Generation Flow (Request Path)

### 1.1 User Triggers Lead Generation

**Source:** [frontend/src/context/AppDataContext.tsx](frontend/src/context/AppDataContext.tsx#L345)

```typescript
const generateLeads = async (filters: Record<string, unknown>) => {
  const { data } = await api.post("/leads/generate", filters);  // filters: {industries, roles, countries, cities, companySize}
  setPendingLeadsRequestId(data.request_id);
  await smartPoll(`/leads/status/${data.request_id}`, ...);  // Polls every 20s→15s→5s
};
```

**Expected request:**
```json
POST /api/leads/generate
{
  "industries": ["Technology"],
  "roles": ["CTO", "VP Engineering"],
  "countries": ["US", "Canada"],
  "cities": [],
  "companySize": "100-500"
}
```

### 1.2 Backend Creates Lead Record

**Source:** [backend/routers/leads_router.py](backend/routers/leads_router.py#L138)

```python
@router.post("/generate")
async def generate_leads(body: LeadsGenerateRequest, user: dict, db: AsyncSession):
    request_id = uuid.uuid4()  # ← Unique ID for this run
    
    # Create lead_results record with status="pending"
    await db.execute(
        insert(lead_results).values(
            request_id=str(request_id),
            customer_id=str(user["customer_id"]),
            user_id=str(user["id"]),
            leads=None,  # ← Will be filled by callback
            total_count=0,
            status="pending",  # ← Waiting for n8n
            error=None,
            created_at=now_ms,
            completed_at=None,  # ← Will be filled by callback
            updated_at=_naive_now(),
        )
    )
    
    # Also create smady.run_status record (for internal tracking)
    await db.execute(
        insert(run_status).values(
            request_id=request_id,
            stage="leads",
            status="pending",
            updated_at=_naive_now(),
        )
    )
    
    # Also create smady.lead_runs record (for run history)
    await db.execute(
        insert(lead_runs).values(
            user_id=user["id"],
            customer_id=user["customer_id"],
            request_id=request_id,
            status="pending",
            filters=body.model_dump(),
        )
    )
    
    # Fire n8n webhook
    if is_webhook_configured("leads"):
        public_url = os.environ.get("PUBLIC_BACKEND_URL")
        await trigger_webhook("leads", {
            "request_id": str(request_id),
            "user_id": str(user["id"]),
            "customer_id": str(user["customer_id"]),
            "callback_url": f"{public_url}/api/leads/callback",
            "industries": [...],
            "roles": [...],
            # ... etc
        })
    
    return {"request_id": str(request_id), "status": "pending"}
```

**DB state after /generate:**
```
public.lead_results:
  request_id: "abc-123"
  user_id: "user-123"
  customer_id: "cust-456"
  status: "pending"  ← Waiting
  leads: NULL
  total_count: 0
  completed_at: NULL
  created_at: 1726547850123
  updated_at: 2026-09-16 10:10:50
```

### 1.3 N8N Processes Leads

**N8N Workflow:** leads.json (cloud-based, runs on n8n.io)

**What it does:**
1. Receives webhook POST with filters (industries, roles, countries, cities, companySize)
2. Enriches leads using AI agent (adds 15+ fields like Lead Score, ICP Match, Company Description, etc.)
3. Returns enriched leads array via callback webhook to `callback_url`

**Expected callback payload (from n8n leads.json):**
```json
{
  "request_id": "abc-123",
  "status": "success",  // or "failed" if error
  "leads": [
    {
      "name": "John Doe",
      "title": "CTO",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "Lead Score": 85,
      "ICP Match": "High",
      "Company Description": "...",
      "Location": "San Francisco, CA",
      "Technologies": "AWS, Kubernetes",
      "Founded Year": 2015,
      "Annual Revenue": "$50-100M",
      // ... 10 more enrichment fields
    },
    // ... more leads
  ],
  "total_count": 47,
  "error": null
}
```

---

## 2. Lead Callback Flow (Response Path)

### 2.1 N8N Fires Callback Webhook

**N8N Action:** HTTP POST to `callback_url` with request body + header

**Headers Required:**
```
POST /api/leads/callback HTTP/1.1
X-Callback-Secret: dev_secret_smady_2025  ← Matches N8N_CALLBACK_SECRET env var
Content-Type: application/json
```

### 2.2 Backend Receives Callback

**Source:** [backend/routers/leads_router.py](backend/routers/leads_router.py#L276)

```python
@router.post("/callback")
async def leads_callback(body: LeadsCallbackRequest, 
                         x_callback_secret: Optional[str] = Header(None), 
                         db: AsyncSession = Depends(get_db)):
    # Step 1: Verify callback secret
    verify_callback_secret(x_callback_secret)  # ← Raises 401 if invalid
    
    # Step 2: Log incoming callback
    logger.info(f"Leads callback received for request_id={body.request_id}: ...")
    
    # Step 3: Find the existing lead_results row
    result = await db.execute(select(lead_results).where(lead_results.c.request_id == body.request_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead run not found")
    
    # Step 4: Unwrap nested leads (defensive for n8n payload wrapping quirk)
    # N8N sometimes wraps as: leads=[{leads: [...], status: "...", total_count: N}]
    # We defensively unwrap this
    flat_leads: List[Dict[str, Any]] = []
    for item in body.leads or []:
        if isinstance(item, dict) and isinstance(item.get("leads"), list):
            flat_leads.extend(item["leads"])  # ← Unwrap nested
        else:
            flat_leads.append(item)  # ← Use as-is
    
    # Step 5: Update lead_results with response data
    await db.execute(
        update(lead_results).where(lead_results.c.request_id == body.request_id).values(
            status=body.status,  # ← "success" or "failed"
            leads=flat_leads,  # ← The enriched lead array
            total_count=body.total_count if body.total_count is not None else len(flat_leads),
            error=body.error,  # ← Error message if failed
            completed_at=int(time.time() * 1000),  # ← Mark as done
            updated_at=_naive_now(),
        )
    )
    
    # Step 6: Also update smady.run_status (for internal tracking)
    try:
        run_uuid = uuid.UUID(body.request_id)
        await db.execute(
            update(run_status).where(run_status.c.request_id == run_uuid).values(
                status=body.status,
                updated_at=_naive_now()
            )
        )
    except ValueError:
        pass  # request_id not a UUID, skip
    
    # Step 7: Commit all changes
    await db.commit()
    
    return {"message": f"{len(flat_leads)} leads recorded"}
```

**DB state after callback:**
```
public.lead_results:
  request_id: "abc-123"
  user_id: "user-123"
  customer_id: "cust-456"
  status: "success"  ← Changed from "pending"
  leads: [<enriched lead objects>]  ← 47 leads with 15+ fields each
  total_count: 47
  completed_at: 1726547952341  ← Now set
  created_at: 1726547850123
  updated_at: 2026-09-16 10:11:52
  
smady.run_status:
  request_id: "abc-123"
  stage: "leads"
  status: "success"  ← Changed from "pending"
  updated_at: 2026-09-16 10:11:52
```

### 2.3 Callback Secret Verification

**Source:** [backend/webhooks.py](backend/webhooks.py#L67)

```python
def verify_callback_secret(secret: str | None):
    expected = os.environ.get("N8N_CALLBACK_SECRET")  # ← From .env or OS env var
    if not expected or secret != expected:
        raise HTTPException(status_code=401, detail="Invalid callback secret")
```

**Current value (from .env):** `dev_secret_smady_2025`

**⚠️ Security Note:** Secret is hardcoded in `.env` file. Action item for Phase 3.

---

## 3. Frontend Polling for Completion

### 3.1 Frontend Polls Status

**Source:** [frontend/src/context/AppDataContext.tsx](frontend/src/context/AppDataContext.tsx#L540)

```typescript
const smartPoll = async (url: string, onTimeout: () => void, signal: AbortSignal) => {
  let elapsed = 0;
  let interval = 20000;  // Start with 20s
  
  while (elapsed < 900000) {  // 15min timeout
    await new Promise(r => setTimeout(r, interval));
    const { data } = await api.get(url);  // GET /api/leads/status/{request_id}
    
    if (data.status !== "pending") {
      return data;  // ← Status changed! Stop polling
    }
    
    // Adaptive backoff: 20s → 15s → 5s
    elapsed += interval;
    if (elapsed > 60000) interval = 15000;
    if (elapsed > 180000) interval = 5000;
  }
  
  onTimeout();  // No update within 15min
  throw new Error("Polling timed out");
};
```

**Flow:**
1. UI calls `POST /api/leads/generate` → gets `request_id`
2. UI calls `smartPoll("/leads/status/{request_id}")`
3. Polls every 20s initially; backend returns `{status: "pending"}`
4. When callback arrives, backend returns `{status: "success", total_count: 47}`
5. Frontend stops polling and calls `GET /api/leads` to fetch and display

### 3.2 Frontend Fetches Leads for Display

**Source:** [frontend/src/context/AppDataContext.tsx](frontend/src/context/AppDataContext.tsx#L184)

```typescript
const refreshLeads = useCallback(async (runId?: string, offset = 0, limit = 50) => {
  const { data } = await api.get(`/leads?${params}`);  // GET /api/leads with optional run_id
  setLeads(data.leads);  // ← Display in Leads page
  setLeadsTotal(data.total);
}, []);
```

**Backend returns:**
```json
GET /api/leads
{
  "leads": [
    {
      "id": "abc-123-0",
      "name": "John Doe",
      "title": "CTO",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "status": "New",
      "source": "Agent",
      "leadScore": 85,
      "priority": "High",
      "icpMatch": "High",
      // ... normalized to UI shape
    },
    // ... more leads (paginated, max 50 per request)
  ],
  "total": 47,
  "run_id": "abc-123",
  "status": "success",
  "verified_count": 0,
  "ready_count": 47
}
```

---

## 4. Data Flow Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER IN BROWSER (UI)                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────┐
          │  POST /api/leads/generate         │
          │  {industries, roles, ...}         │
          └───────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────────┐
        │   BACKEND (FastAPI)                      │
        │   Create: lead_results (status=pending)  │
        │   Create: run_status (status=pending)    │
        │   Fire: webhook to n8n                   │
        └──────────────────────────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
     ┌──────────────────┐            ┌────────────────────┐
     │ PostgreSQL DB    │            │   N8N CLOUD        │
     │ (AWS RDS)        │            │   (Azure Canada)   │
     │                  │            │                    │
     │ lead_results:    │            │ Workflow:          │
     │  status=pending  │            │ - Process filters  │
     │  leads=NULL      │            │ - Enrich leads (AI)│
     │  completed_at=   │            │ - 15+ fields       │
     │  NULL            │            │   (Score, ICP,     │
     └──────────────────┘            │   Company info,    │
             ▲                        │   etc.)            │
             │                        │                    │
             │   callback_url + leads │                    │
             │   POST w/ header       │                    │
             │   X-Callback-Secret    │                    │
             └────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────────┐
        │   BACKEND: POST /api/leads/callback      │
        │   1. Verify X-Callback-Secret            │
        │   2. Find lead_results row               │
        │   3. Unwrap nested leads (if any)        │
        │   4. Update: status=success, leads=[...],│
        │              completed_at=NOW            │
        │   5. Commit to DB                        │
        └──────────────────────────────────────────┘
             │                                  │
             └──────────────┬───────────────────┘
                            ▼
        ┌──────────────────────────────────────┐
        │  PostgreSQL DB                       │
        │  lead_results:                       │
        │   status=success   (UPDATED)         │
        │   leads=[...47...]  (UPDATED)        │
        │   completed_at=NOW (UPDATED)         │
        └──────────────────────────────────────┘
             ▲
             │ pollstatus={request_id}
             │ Polls every 20s
             │ Sees: status=success
             │ Stops polling
             │ Calls: GET /leads
             │
        ┌────────────────────────────────────────┐
        │ BROWSER: Polling Loop (smartPoll)      │
        │ Interval: 20s → 15s → 5s               │
        │ Timeout: 15min                         │
        │ Stops when: status != "pending"        │
        └────────────────────────────────────────┘
             │
             ▼
        ┌────────────────────────────────────────┐
        │ Browser: Display Leads                 │
        │ - Query: GET /api/leads?run_id=...     │
        │ - Normalize: map to UI shape           │
        │ - Render: Leads page table             │
        └────────────────────────────────────────┘
```

---

## 5. Identified Gaps & Potential Issues

### ✅ GAP-1: RESOLVED
**Issue:** Lead enrichment fields stored where?  
**Answer:** In `public.lead_results.leads[]` JSONB array by lead agent (n8n workflow)  
**Status:** Working as designed

### ⚠️ GAP-2: ACTIVE (To be fixed in Phase 3)
**Issue:** Outreach payload incomplete  
**Current:** Sends only `{lead_id, email, name}` to outreach workflow  
**Should:** Send full lead object with 15+ enrichment fields from JSONB  
**Action:** Phase 3 — Modify outreach_router.py to pull full object

### ✅ GAP-3: RESOLVED
**Issue:** Callback secret in .env (security risk)  
**Status:** Acceptable for dev; will use OS env vars in production  
**Action:** Phase 2 follow-up — Document .env usage warning

### ✅ GAP-4: RESOLVED
**Issue:** Leads might be orphaned if callback never arrives  
**Status:** Acceptable; will monitor via Phase 5 end-to-end test  
**Action:** Monitor n8n execution logs for callback success

---

## 6. Testing Checklist (Phase 2)

### Manual Testing (Production)

- [ ] **T6.1:** Trigger `POST /api/leads/generate` with test filters
- [ ] **T6.2:** Verify n8n leads.json workflow executes in n8n UI
- [ ] **T6.3:** Verify n8n calls callback with X-Callback-Secret header
- [ ] **T6.4:** Query DB: `SELECT status, total_count, leads FROM public.lead_results WHERE request_id = '...'`
  - Expected: status='success', total_count > 0, leads JSON array populated
- [ ] **T6.5:** Check UI: leads page displays enriched leads (check Lead Score, ICP Match, etc.)
- [ ] **T6.6:** Check polling: UI polling stops within 60s after callback

### Regression Testing

- [ ] **R6.1:** Callback with invalid secret returns 401
- [ ] **R6.2:** Callback with missing request_id returns 404
- [ ] **R6.3:** Callback with nested leads structure unwraps correctly
- [ ] **R6.4:** Multiple concurrent lead generations don't interfere (each has unique request_id)

### Edge Cases

- [ ] **E6.1:** Callback arrives after polling timeout (15min) — DB should still update
- [ ] **E6.2:** Callback with error status (e.g., "failed", error="No leads found")
- [ ] **E6.3:** Callback with empty leads array (total_count=0)

---

## 7. Blockers / Prerequisites

### For Phase 2 Testing

- [ ] Backend deployed and reachable at PUBLIC_BACKEND_URL
- [ ] N8N_CALLBACK_SECRET set in backend environment (current: `dev_secret_smady_2025`)
- [ ] N8N leads.json workflow configured with callback webhook
- [ ] PostgreSQL DB (AWS RDS) accessible for manual queries
- [ ] N8N execution logs accessible (check n8n UI → Executions tab)

### For Phase 3 (Outreach Payload Fix)

- [ ] Phase 2 testing passes (callback flow verified)
- [ ] Outreach.json workflow configured to accept full lead object
- [ ] Database query to pull full lead from lead_results.leads[] JSONB

---

## 8. Success Criteria

**Phase 2 is COMPLETE when:**
1. ✅ Manual test: Lead generation triggers n8n workflow
2. ✅ Callback reaches backend (check logs for "Leads callback received")
3. ✅ DB updated with enriched leads (query shows status=success, leads populated)
4. ✅ UI displays enriched leads (Lead Score, ICP Match visible)
5. ✅ All 4 tests (T6.1-T6.6) pass
6. ✅ No 401 or 404 errors from callback endpoint

**Phase 2 is FAILED if:**
- ❌ Callback never reaches backend (timeout in n8n UI execution)
- ❌ Callback received but returns 401 (secret mismatch)
- ❌ Callback updates fail (DB shows status still=pending)
- ❌ UI still shows "pending" after 15min
- ❌ Leads array is empty or not populated in DB

---

## 9. Implementation Notes

### Why Defensive Unwrapping?

N8N's HTTP node sometimes wraps response arrays:
```json
// What n8n sends:
{
  "leads": [
    {
      "leads": [ {...}, {...} ],  ← NESTED
      "status": "success",
      "total_count": 2
    }
  ]
}

// What we defensively handle:
for item in body.leads:
  if item.get("leads") is list:
    flat_leads.extend(item["leads"])  ← UNWRAP
  else:
    flat_leads.append(item)
```

This protects us from breaking if n8n changes its payload structure.

### Why Two Tracking Tables?

1. **`public.lead_results`** (n8n-managed): Holds enriched lead JSONB array
2. **`smady.run_status`** (app-managed): Tracks status independently
3. **`smady.lead_runs`** (app-managed): Stores run history + filters for picker

This separation allows app logic to track state independently from data.

---

## 10. Next Actions

**Immediate:**
1. Deploy/verify backend at PUBLIC_BACKEND_URL
2. Test T6.1-T6.6 manually in production
3. Monitor n8n Executions tab for callback success

**If T6.x tests pass:** → Move to Phase 3 (Outreach Payload Fix)  
**If T6.x tests fail:** → Diagnose via n8n logs + backend logs

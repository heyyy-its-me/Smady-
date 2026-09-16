# PHASE 3 ANALYSIS: Outreach Parameters Fix

## Executive Summary

**Gap:** Outreach workflow receives incomplete lead data  
**Current:** Only `{lead_id, email, name}` sent to n8n  
**Required:** Full enriched lead object with 15+ fields  
**Status:** 🔴 ACTIVE — Ready to fix

---

## 1. Problem Analysis

### 1.1 Current Implementation (Broken)

**Source:** [backend/routers/outreach_router.py](backend/routers/outreach_router.py#L82)

```python
@router.post("/campaigns")
async def create_campaign(body: CampaignCreateRequest, user: dict, db: AsyncSession):
    eligible = await _eligible_leads(db, user["id"], run_id=body.runId)
    leads_count = len(eligible)
    
    # ❌ PROBLEM: Only extract 3 fields!
    recipient_leads = [
        {"lead_id": l["id"], "email": l["email"], "name": l["name"]} 
        for l in eligible  # l is a normalized lead with 30+ fields!
    ]
    
    # Send truncated payload to n8n
    webhook_ok = await trigger_webhook("outreach", {
        "request_id": str(request_id),
        "user_id": user["id"],
        "subject": body.subject,
        "body": body.body,
        "leads": recipient_leads,  # ← Only 3 fields per lead!
    })
```

**What gets sent to n8n:**
```json
{
  "request_id": "campaign-uuid",
  "user_id": "user-123",
  "subject": "Meeting Request",
  "body": "Let's talk about...",
  "leads": [
    {
      "lead_id": "abc-123-0",
      "email": "john@acme.com",
      "name": "John Doe"
      // ❌ Missing: title, company, Lead Score, ICP Match, etc.
    }
  ]
}
```

### 1.2 What Outreach Workflow Expects

**N8N Workflow:** outreach.json (cloud-based)

**What it needs to do:**
1. Loop through leads
2. For each lead, compose personalized email using enrichment data
3. Send via Gmail with personalization hook
4. Track open/reply/bounce events

**To do this, it needs:**
- lead_id, email, name (for ID + addressing)
- company, title, industry (for context)
- Lead Score, ICP Match (for prioritization)
- Personalization Hook, Pain Points Matched (for email content)
- Recommended Action, Company Description (for body)
- LinkedIn, phone, location (for follow-up)

**Current state:** N8N probably has dummy/fallback values since data is missing → emails are generic/not personalized

---

## 2. The Fix

### 2.1 Change: Send Full Normalized Lead Object

**Location:** [backend/routers/outreach_router.py](backend/routers/outreach_router.py#L82)

**Current (Broken):**
```python
recipient_leads = [
    {"lead_id": l["id"], "email": l["email"], "name": l["name"]} 
    for l in eligible
]
```

**Fixed:**
```python
# Send the FULL normalized lead object with all enrichment fields
recipient_leads = eligible  # l already has 30+ fields from _normalize_lead()
```

### 2.2 Normalized Lead Shape (What Gets Sent)

**Source:** [backend/routers/leads_router.py](backend/routers/leads_router.py#L74)

```python
def _normalize_lead(raw: Dict[str, Any], request_id: str, index: int) -> Dict[str, Any]:
    return {
        # Identity
        "id": f"{request_id}-{index}",
        "email": pick("email", "email_address", "Email"),
        "name": pick("name", "full_name", "lead_name", "Contact Name"),
        
        # Company context
        "company": pick("Company Name", "company", "organization", "company_name"),
        "title": pick("title", "job_title", "position", "Designation"),
        "industry": pick("Industry"),
        "domain": pick("domain", "website", "company_domain", "Website"),
        "location": pick("Location"),
        "phone": pick("Phone"),
        "linkedin": pick("linkedin", "linkedin_url", "linkedin_profile", "LinkedIn"),
        
        # AI Enrichment (from lead agent)
        "leadScore": raw.get("Lead Score"),
        "priority": pick("Priority"),
        "icpMatch": pick("ICP Match"),
        "icpTier": pick("icp_tier"),
        "seniority": pick("seniority"),
        "employees": pick("Employees", "Company Size"),
        "foundedYear": pick("Founded Year"),
        "fundingStage": pick("Funding Stage"),
        "annualRevenue": pick("Annual Revenue"),
        "technologies": pick("Technologies"),
        "specialties": pick("Specialties"),
        "companyDescription": pick("Company Description"),
        "personalizationHook": pick("personalization_hook", "AI Insight"),
        "painPointsMatched": pick("pain_points_matched"),
        "recommendedAction": pick("recommended_action"),
        
        # Status tracking
        "status": pick("status", "Qualification Status", default="New"),
        "source": pick("source", default="Agent"),
        "about": pick("about", "summary", "description", "Company Description", "AI Insight"),
        "leadRunId": request_id,
    }
```

**After fix, n8n receives:**
```json
{
  "leads": [
    {
      "id": "abc-123-0",
      "email": "john@acme.com",
      "name": "John Doe",
      "company": "Acme Corp",
      "title": "CTO",
      "industry": "Technology",
      "domain": "acme.com",
      "location": "San Francisco, CA",
      "phone": "+1-415-555-0100",
      "linkedin": "linkedin.com/in/johndoe",
      "leadScore": 85,
      "priority": "High",
      "icpMatch": "High",
      "icpTier": "Tier 1",
      "seniority": "C-Level",
      "employees": "500-1000",
      "foundedYear": 2015,
      "fundingStage": "Series C",
      "annualRevenue": "$100M-500M",
      "technologies": "AWS, Kubernetes, GraphQL",
      "specialties": "Cloud Infrastructure, DevOps",
      "companyDescription": "Leading provider of cloud infrastructure automation for enterprises...",
      "personalizationHook": "CTO at a Series C cloud-native company using modern DevOps practices",
      "painPointsMatched": "CI/CD complexity, infrastructure costs, Kubernetes management",
      "recommendedAction": "Schedule 30min discovery call to discuss infrastructure modernization",
      "status": "New",
      "source": "Agent",
      "leadRunId": "abc-123"
    },
    // ... more leads
  ]
}
```

---

## 3. Impact Analysis

### 3.1 What Improves

**Email Personalization:**
- ✅ N8N can now compose emails using Lead Score, ICP Match for relevance scoring
- ✅ Can use Personalization Hook in email subject/opening
- ✅ Can reference company size, industry, technologies for context
- ✅ Can tailor timing/approach based on Funding Stage + Priority
- ✅ Can prioritize outreach queue by ICP Match + Lead Score

**Campaign Effectiveness:**
- ✅ Higher open rates (personalized subject lines)
- ✅ Higher reply rates (relevant pain points addressed)
- ✅ Better lead quality targeting (use ICP Match to filter)

**Data Traceability:**
- ✅ N8N logs contain full lead context
- ✅ Easier debugging if campaign fails
- ✅ Better analytics (can segment by industry, funding stage, etc.)

### 3.2 Backward Compatibility

**No Breaking Changes:**
- Lead shape is already normalized by `_eligible_leads()`
- N8N workflow just receives more fields (optional fields it can ignore)
- No database changes required
- UI is unaffected

---

## 4. Code Change

### 4.1 File to Modify

**File:** [backend/routers/outreach_router.py](backend/routers/outreach_router.py)  
**Line:** 82-84  
**Method:** `create_campaign()`

### 4.2 Exact Change

**Before:**
```python
    if configured:
        recipient_leads = [{"lead_id": l["id"], "email": l["email"], "name": l["name"]} for l in eligible]
        webhook_ok = await trigger_webhook("outreach", {
```

**After:**
```python
    if configured:
        recipient_leads = eligible  # Send full normalized lead object with all enrichment fields
        webhook_ok = await trigger_webhook("outreach", {
```

### 4.3 Why This Works

1. `eligible` is already a list of normalized leads from `_eligible_leads()`
2. `_normalize_lead()` already extracts ALL 30+ fields from raw n8n data
3. No truncation needed — just pass the full object
4. N8N workflow can now use all available fields
5. Optional fields (leadScore, personalizationHook, etc.) won't break n8n if missing

---

## 5. Testing Checklist

### Unit Tests (Local)

- [ ] **U5.1:** Mock `_eligible_leads()` to return 3 test leads with all enrichment fields
- [ ] **U5.2:** Call `create_campaign()` 
- [ ] **U5.3:** Assert webhook payload contains full lead objects (not truncated)
- [ ] **U5.4:** Assert all 30+ fields present in lead[0]

### Integration Tests (Production)

- [ ] **I5.1:** Create test campaign (trigger `POST /api/outreach/campaigns`)
- [ ] **I5.2:** Monitor n8n outreach.json execution
- [ ] **I5.3:** Verify webhook payload logged shows full lead data
- [ ] **I5.4:** Check n8n Gmail workflow can compose personalized emails (uses enrichment fields)
- [ ] **I5.5:** Verify emails sent contain company name, title, personalization hook

### Regression Tests

- [ ] **R5.1:** Campaign creation still works for users with no leads
- [ ] **R5.2:** Campaign creation still works for single lead
- [ ] **R5.3:** Campaign creation still works for >100 leads
- [ ] **R5.4:** Campaign status updates correctly (Queued → Sent → Failed)
- [ ] **R5.5:** Email events (sent/opened/replied/bounced) still tracked correctly

### Edge Cases

- [ ] **E5.1:** Lead with missing enrichment fields (null values passed to n8n)
- [ ] **E5.2:** Lead with special characters in personalization hook
- [ ] **E5.3:** Campaign with leads from multiple different lead runs

---

## 6. Success Criteria

**Phase 3 is COMPLETE when:**
1. ✅ Code change deployed to backend
2. ✅ Outreach campaign created successfully
3. ✅ N8N receives full lead object in webhook payload
4. ✅ N8N uses enrichment fields to personalize emails
5. ✅ Emails sent contain company name, title, personalization hook
6. ✅ All U5.x, I5.x, R5.x tests pass
7. ✅ No regressions in campaign creation/status/email tracking

**Phase 3 is FAILED if:**
- ❌ Webhook payload still truncated (only 3 fields)
- ❌ N8N workflow errors on missing expected fields
- ❌ Campaign creation breaks
- ❌ Email personalization doesn't improve

---

## 7. Implementation Readiness

### Prerequisites Met
- ✅ Code change is trivial (1-line deletion)
- ✅ No database migrations needed
- ✅ No UI changes needed
- ✅ Backward compatible
- ✅ Low risk of regression

### Deployment Steps
1. Edit [backend/routers/outreach_router.py](backend/routers/outreach_router.py#L82)
2. Replace truncation logic with: `recipient_leads = eligible`
3. Test locally (mock outreach webhook, verify payload)
4. Deploy to backend
5. Test in production (create campaign, check n8n execution logs)

---

## 8. Time Estimate

- Code change: **2 min**
- Local testing: **10 min**
- Production testing: **15 min**
- **Total Phase 3: ~30 min**

---

## 9. Owner Handoff

**Assigned to:** Senior Full-Stack Engineer  
**Priority:** HIGH (enables Phase 4 proposal automation)  
**Blocker for:** Phase 4 (Proposal automation depends on working outreach)

---

## 10. Related Gaps

**Phase 3 enables fixes for:**
- GAP-2: ✅ Outreach payload incomplete (FIXED by this phase)
- GAP-5: Proposal review UI (Phase 4)
- GAP-3: Proposal scheduler (Phase 4)

**After Phase 3, proceed to Phase 4:** Proposal Automation


# n8n Outreach Workflow - Configuration Guide

## Flow Logic

**UI sends:**
```json
{
  "campaign_id": "uuid",
  "user_id": "user123",
  "subject": "Quick question about {company}", // Can be empty!
  "body": "Hi {first_name}...",                // Can be empty!
  "leads": [
    {
      "id": "lead123",
      "name": "John Smith",
      "email": "john@company.com",
      "company_name": "TechCorp",
      "industry": "SaaS",
      "about": "They provide cloud solutions",
      "company_description": "Enterprise cloud platform for data analytics",
      "personalization_hook": "They recently launched their AI product",
      "pain_points_matched": "Manual data processing, high costs",
      "lead_score": 92,
      "icp_match": true,
      "job_title": "VP of Engineering",
      "website": "techcorp.com"
    }
  ]
}
```

---

## Key Nodes to Update

### **1. Loop Over Items** → **Check Subject/Body**

**New Node: "Check if Subject/Body Provided"** (Code node)
```javascript
const item = $input.item.json;
const webhookData = $('Webhook1').first().json;

// Check if subject and body are provided from UI
const hasSubject = webhookData.subject && webhookData.subject.trim().length > 0;
const hasBody = webhookData.body && webhookData.body.trim().length > 0;

return {
  ...item,
  hasCustomSubject: hasSubject,
  hasCustomBody: hasBody,
  customSubject: webhookData.subject || '',
  customBody: webhookData.body || ''
};
```

**Then use IF node to branch:**
- If `hasCustomSubject && hasCustomBody` → Skip AI, go directly to formatting
- Else → Run AI generation with rich lead data

---

### **2. Enhanced AI Prompt (Message a model3)**

**Replace the current prompt with this:**

```
You are a B2B sales expert who crafts personalized outreach emails.

PROSPECT DATA:
- Name: {{ $('Loop Over Items').item.json['Contact Name'] }}
- Company: {{ $('Loop Over Items').item.json['Company Name'] }}
- Job Title: {{ $('Loop Over Items').item.json['job_title'] || 'Unknown' }}
- Industry: {{ $('Loop Over Items').item.json['Industry'] }}
- Company About: {{ $('Loop Over Items').item.json['about'] }}
- Company Description: {{ $('Loop Over Items').item.json['company_description'] }}
- Company Website: {{ $('Loop Over Items').item.json['website'] }}
- Lead Score: {{ $('Loop Over Items').item.json['lead_score'] || 'N/A' }}/100
- ICP Match: {{ $('Loop Over Items').item.json['icp_match'] ? 'Yes ✓' : 'No' }}

KEY INSIGHTS FROM RESEARCH:
- Personalization Hook: {{ $('Loop Over Items').item.json['personalization_hook'] }}
- Pain Points Matched: {{ $('Loop Over Items').item.json['pain_points_matched'] }}

OUR SOLUTION:
- Product: {{ $('Loop Over Items').item.json['product_name'] }}
- What We Do: {{ $('Loop Over Items').item.json['positioning'] }}
- How We Solve: {{ $('Loop Over Items').item.json['pain_points'] }}

TASK:
Generate a professional, personalized cold email that:
1. Opens with a specific observation from their company or recent activity
2. Shows understanding of their industry and role
3. Connects to a specific pain point they face
4. Positions our solution as the fit
5. Has a clear, low-pressure CTA

Return ONLY this JSON (no markdown):
{
  "subject": "Subject line using personalization hook (max 50 chars)",
  "greeting": "Hi [FirstName],",
  "opening_hook": "Specific observation that proves research",
  "what_we_do": "One sentence about what we do",
  "pain_point_line": "How our solution solves their specific pain",
  "stat_1_number": "3.2×",
  "stat_1_label": "specific metric",
  "stat_2_number": "47%",
  "stat_2_label": "relevant metric",
  "stat_3_number": "14 days",
  "stat_3_label": "time to result",
  "benefit_1": "Concrete benefit 1",
  "benefit_2": "Concrete benefit 2",
  "benefit_3": "Concrete benefit 3",
  "why_us": "Why they should trust us",
  "cta_line": "Clear, specific CTA",
  "personalization_hook": "The key insight that made this email personal"
}
```

---

### **3. Smart Email Formatter (Code in JavaScript2)**

**Replace with this logic:**

```javascript
const item = $('Loop Over Items').item.json;
const checkData = $('Check if Subject/Body Provided').item.json;

let subject, emailBody;

// Use custom subject if provided, else use AI-generated
if (checkData.hasCustomSubject) {
  subject = checkData.customSubject;
} else {
  const aiOutput = JSON.parse($('Message a model3').item.json.output[0].content[0].text);
  subject = aiOutput.subject;
}

// If custom body provided AND it's not placeholder, use it
if (checkData.hasCustomBody && !checkData.customBody.includes('{')) {
  // User provided actual body, use it directly
  emailBody = checkData.customBody
    .replace(/{first_name}/g, (item['Contact Name'] || 'there').split(' ')[0])
    .replace(/{company}/g, item['Company Name'] || 'your company')
    .replace(/{company_website}/g, item['website'] || 'example.com');
} else {
  // Generate HTML email using AI data
  const aiOutput = JSON.parse($('Message a model3').item.json.output[0].content[0].text);
  
  const companyName = item['company_name'] || 'Our Company';
  const productName = item['product_name'] || 'Our Product';
  const senderEmail = 'claudesmadlytics@gmail.com';

  // ... [Include the full HTML template from existing code]
  // But use aiOutput fields
  
  emailBody = `... HTML template using ${aiOutput.greeting}, ${aiOutput.opening_hook}, etc.`;
}

return {
  Email: item.Email,
  'Lead ID': item['Lead ID'],
  subject: subject,
  body: emailBody,
  personalization_hook: item['personalization_hook'] || '',
  lead_score: item['lead_score'],
  icp_match: item['icp_match']
};
```

---

### **4. Before "Send a message" - Add Postgres Logging**

**New Node: "Prepare Email Log"** (Code)
```javascript
return {
  campaign_id: $('Webhook1').first().json.campaign_id,
  user_id: $('Webhook1').first().json.user_id,
  lead_id: $json['Lead ID'],
  email: $json.Email,
  status: 'sent',
  subject: $json.subject
};
```

**New Node: "Log Email to DB"** (Postgres)
```sql
INSERT INTO smady.outreach_emails 
  (id, campaign_id, lead_id, email, status, user_id, created_at, sent_at)
VALUES 
  (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
ON CONFLICT DO NOTHING
```

Parameters:
- `$1` = `{{ $json.campaign_id }}`
- `$2` = `{{ $json.lead_id }}`
- `$3` = `{{ $json.email }}`
- `$4` = `{{ $json.status }}`
- `$5` = `{{ $json.user_id }}`

---

### **5. "Send a message" Node**

Keep as is, but values now come from smart formatter:
```
Send To: {{ $json.Email }}
Subject: {{ $json.subject }}
Message: {{ $json.body }}
```

---

## Decision Tree

```
┌─ Webhook receives (subject, body, leads)
│
├─ Check if subject and body are provided and non-empty
│
├─ YES: hasCustomSubject && hasCustomBody
│  └─ Skip AI, use custom values directly
│  └─ Go to Email Formatter
│
├─ NO: Empty or missing
│  └─ Run Message a model2 (company analysis)
│  └─ Run Message a model3 (AI email generator with full lead data)
│  └─ Parse AI output
│  └─ Go to Email Formatter
│
├─ Email Formatter
│  └─ If custom body provided (no {variables}): format and send
│  └─ Else: build HTML template with AI output
│
├─ Prepare & Log
│  └─ Extract campaign_id, user_id, lead_id, email, status
│
├─ Send Email via Gmail
│
├─ Log to Postgres
│  └─ Record in smady.outreach_emails table
│
└─ Update Campaign Status
```

---

## Implementation Steps

1. **Add "Check if Subject/Body Provided"** after Loop Over Items
2. **Update Message a model3 prompt** with full lead enrichment fields
3. **Replace Code in JavaScript2** with smart formatter logic
4. **Add Postgres insert node** before "Send a message"
5. **Test with:**
   - Empty subject/body (should use AI)
   - Custom subject/body (should skip AI)
   - Lead with rich enrichment data (AI should use it)

---

## Backend Update

Your `POST /api/outreach/campaigns` already sends all this data. Just make sure it includes:

```python
webhook_payload = {
    "campaign_id": str(row.id),
    "request_id": str(request_id),
    "user_id": user["id"],
    "subject": body.subject,        # From UI
    "body": body.body,              # From UI
    "leads": recipient_leads        # All enriched fields
}
```

Where `recipient_leads` includes all fields from `_normalize_lead()`:
- `name`, `email`, `company_name`, `industry`
- `about`, `company_description`
- `personalization_hook`, `pain_points_matched`
- `lead_score`, `icp_match`, `job_title`, `website`
- etc.

This is already happening in your current code! ✅

---

## Result

✨ **Professional, personalized emails that:**
- Use UI-provided subject/body if given
- Generate smart AI emails with full lead context if blank
- Include all enrichment data for maximum personalization
- Log every send to database for tracking
- Respect user intent while providing intelligent fallback

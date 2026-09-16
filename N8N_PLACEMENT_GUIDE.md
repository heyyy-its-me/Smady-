# N8N Proposal Workflow - Node Placement Guide

## 📍 PLACEMENT MAP (Visual Grid)

```
X-AXIS (Left to Right) ────────────────────────────────────────────────→

-2208           -1900           -1600           -1320           800
  │               │               │               │              │
  │               │               │               │              │
  ├─ 📅 Trigger   │               │               │              │
  │   (Meeting)   │               │               │              │
  │  [x: -2208]   │               │               │              │
  │  [y: 0]       │               │               │              │
  │               │               │               │              │
  │    ├──────────→ 🔀 Merge      │               │              │
  │    │           [x: -1900]     │               │              │
  │    │           [y: 208]       │               │              │
  │    │                          │               │              │
  ├─ 🎯 Trigger   │               │               │              │
  │   (UI)        │               │               │              │
  │  [x: -2208]   │               │               │              │
  │  [y: 416]     │               │               │              │
  │               │               │               │              │
  │    └──────────→ 🔀 Merge      │               │              │
                   [x: -1900]     │               │              │
                   [y: 208]       │               │              │
                         │        │               │              │
                         └───────→ 📋 HTTP Get   │              │
                                   [x: -1600]    │              │
                                   [y: 208]      │              │
                                         │       │              │
                                         └──────→ ⏱️ Wait        │
                                                 [x: -1320]    │
                                                 [y: 208]      │
                                                       │       │
                                                       └─────→ Loop Over Items
                                                               │
                                                               ↓
                                                               (Existing flow)
                                                               │
                                                               ↓
                                                        Send a message
                                                               │
                                                               ↓
                                                        ✅ HTTP Callback
                                                        [x: 800]
                                                        [y: 208]
```

---

## 🔧 STEP-BY-STEP SETUP

### **Step 1: Delete Old Manual Trigger**
- In N8N UI, find node "When clicking 'Execute workflow'"
- Right-click → Delete
- ✅ This clears the left side

### **Step 2: Add New Nodes (Copy-Paste Ready)**

#### **NODE 1: Scheduled Trigger (From Meeting Workflow)**
```json
{
  "parameters": {"inputSource": "passthrough"},
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "typeVersion": 1.2,
  "position": [-2208, 0],
  "id": "scheduled-trigger-from-meeting",
  "name": "📅 Trigger: From Meeting (Scheduled)"
}
```
**WHERE TO PLACE**: Top left (far left, top row)

#### **NODE 2: Manual Trigger (From UI)**
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "proposal-send-manual",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2.1,
  "position": [-2208, 416],
  "id": "manual-trigger-from-ui",
  "name": "🎯 Trigger: From UI (Manual Send)",
  "webhookId": "proposal-send-manual"
}
```
**WHERE TO PLACE**: Bottom left (same x, lower y)

#### **NODE 3: Merge Both Triggers**
```json
{
  "parameters": {
    "mode": "mergeByKey",
    "mergeByFields": {"keyFields": []},
    "options": {}
  },
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3.1,
  "position": [-1900, 208],
  "id": "merge-both-triggers",
  "name": "🔀 Merge: Both Triggers"
}
```
**WHERE TO PLACE**: Middle-left (center vertically)

#### **NODE 4: Get Meeting Details**
```json
{
  "parameters": {
    "url": "={{ 'https://YOUR_BACKEND_URL/api/meetings/' + ($json.meeting_id || '') }}",
    "method": "GET",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "Bearer YOUR_BACKEND_API_TOKEN"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.4,
  "position": [-1600, 208],
  "id": "http-get-meeting-details",
  "name": "📋 HTTP: Get Meeting + Lead Details",
  "onError": "continueRegularOutput"
}
```
**WHERE TO PLACE**: Middle (moving right)
**⚠️ IMPORTANT**: Replace `YOUR_BACKEND_URL` with actual URL (e.g., `https://smady-prototype.vercel.app`)
**⚠️ IMPORTANT**: Replace `YOUR_BACKEND_API_TOKEN` with actual token

#### **NODE 5: Conditional Wait**
```json
{
  "parameters": {
    "amount": "={{ $json.source === 'scheduled' ? 3 : 0 }}",
    "unit": "hours"
  },
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1.1,
  "position": [-1320, 208],
  "id": "conditional-wait-3h",
  "name": "⏱️ Wait: 3h if Scheduled",
  "webhookId": "conditional-wait-proposal"
}
```
**WHERE TO PLACE**: Middle-right

#### **NODE 6: Backend Callback Webhook**
```json
{
  "parameters": {
    "method": "POST",
    "url": "=https://YOUR_BACKEND_URL/api/proposals/webhook",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "X-Callback-Secret",
          "value": "0ae44ca96b5093fcd70cdf5dd7f7c705"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({\n  user_id: $json.user_id,\n  meeting_id: $json.meeting_id,\n  lead_email: $json.lead_email,\n  lead_name: $json.lead_name,\n  company: $json.company,\n  proposal_json: $('Message a model3').item.json,\n  guardrail_errors: [],\n  final_status: 'Sent',\n  context_json: {\n    meeting_date: $json.meeting_date,\n    lead_score: $json.lead_score,\n    icp_match: $json.icp_match,\n    source: $json.source\n  }\n}) }}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [800, 208],
  "id": "webhook-backend-callback",
  "name": "✅ HTTP: Backend Callback Webhook"
}
```
**WHERE TO PLACE**: Right side (after "Send a message" email node)
**⚠️ IMPORTANT**: Replace `YOUR_BACKEND_URL` with actual URL

---

### **Step 3: Connect the Nodes**

#### **Connection 1: Trigger (Meeting) → Merge**
1. Click circle on right side of "📅 Trigger: From Meeting (Scheduled)"
2. Drag → Left side circle of "🔀 Merge: Both Triggers"

#### **Connection 2: Trigger (UI) → Merge**
1. Click circle on right side of "🎯 Trigger: From UI (Manual Send)"
2. Drag → Left side circle of "🔀 Merge: Both Triggers"

#### **Connection 3: Merge → Get Meeting Details**
1. Click right circle of "🔀 Merge: Both Triggers"
2. Drag → Left circle of "📋 HTTP: Get Meeting + Lead Details"

#### **Connection 4: Get Meeting Details → Wait**
1. Click right circle of "📋 HTTP: Get Meeting + Lead Details"
2. Drag → Left circle of "⏱️ Wait: 3h if Scheduled"

#### **Connection 5: Wait → Loop Over Items**
1. Click right circle of "⏱️ Wait: 3h if Scheduled"
2. Drag → Left circle of "Loop Over Items"

#### **Connection 6: Send Email → Callback Webhook**
1. Find "Send a message" node (email sending)
2. Click right circle
3. Drag → Left circle of "✅ HTTP: Backend Callback Webhook"

#### **Connection 7: Callback → Google Sheets**
1. Click right circle of "✅ HTTP: Backend Callback Webhook"
2. Drag → Left circle of "Append or update row in sheet"

---

## ⚙️ CONFIGURATION CHECKLIST

- [ ] Replace `YOUR_BACKEND_URL` in:
  - Node 4 (Get Meeting Details)
  - Node 6 (Backend Callback Webhook)
  
- [ ] Replace `YOUR_BACKEND_API_TOKEN` in:
  - Node 4 (Get Meeting Details) - Bearer token for API auth

- [ ] Verify X-Callback-Secret in Node 6:
  - Must match backend env var: `0ae44ca96b5093fcd70cdf5dd7f7c705`

- [ ] Test Webhook URLs:
  - Node 2: `https://n8n-smady.../webhook/proposal-send-manual`
  - Node 5: `https://n8n-smady.../webhook/conditional-wait-proposal`

---

## 🚀 WORKFLOW LOGIC

### **Path A: Scheduled (from Meeting Workflow)**
```
Meeting Workflow calls: {meeting_id, lead_email, meet_link}
         ↓
📅 Trigger (receives from meeting workflow)
         ↓
🔀 Merge (consolidates)
         ↓
📋 Get Meeting Details (fetches full lead + meeting data)
         ↓
⏱️ Wait (3 hours - gives time for meeting to complete)
         ↓
Loop Over Items → AI Analysis → Generate → Send Email
         ↓
✅ Callback → Save to Backend
```

### **Path B: Manual (from UI)**
```
Frontend: POST /webhook/proposal-send-manual {meeting_id, user_id}
         ↓
🎯 Trigger (receives from UI webhook)
         ↓
🔀 Merge (consolidates)
         ↓
📋 Get Meeting Details (fetches full lead + meeting data)
         ↓
⏱️ Wait (0 hours - immediate for manual)
         ↓
Loop Over Items → AI Analysis → Generate → Send Email
         ↓
✅ Callback → Save to Backend
```

---

## 🔑 KEY PARAMETERS TO UPDATE

| Node | Parameter | Current | Replace With |
|------|-----------|---------|--------------|
| Node 4 | URL | `YOUR_BACKEND_URL` | `https://smady-prototype.vercel.app` |
| Node 4 | Auth Token | `YOUR_BACKEND_API_TOKEN` | Your actual API token |
| Node 6 | URL | `YOUR_BACKEND_URL` | `https://smady-prototype.vercel.app` |
| Node 6 | X-Callback-Secret | `0ae44ca96b5093fcd70cdf5dd7f7c705` | ✅ Correct (from backend) |

---

## ✅ READY TO TEST?

After placing nodes:

1. **Test Manual Path**: Click "Test workflow" on 🎯 Manual Trigger
2. **Test Scheduled Path**: In meeting.json, verify Execute Workflow node sends: `{meeting_id, lead_email, meet_link}`
3. **Check Backend**: Verify `/api/proposals/webhook` endpoint is active

---

## 📌 FILE PROVIDED

See: `N8N_NODES_COPYPASTE.json` - Contains all 6 nodes + connections ready to import

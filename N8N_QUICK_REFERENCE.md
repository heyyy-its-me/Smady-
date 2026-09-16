# N8N Node Placement - Quick Reference

## 🎯 EXACT POSITIONS TO PLACE EACH NODE

```
LEFT SIDE (X: -2208)       MIDDLE-LEFT (X: -1900)    MIDDLE (X: -1600)    RIGHT (X: -1320)    FAR RIGHT (X: 800)
═══════════════════        ════════════════════      ═════════════════    ═════════════════    ═════════════════

TOP
│
├─ 📅 Trigger               
│  (Meeting)      ──────────→ 🔀 Merge         ──────→ 📋 HTTP        ──────→ ⏱️ Wait      ──────→ Existing
│  Position:                 Position:                 (Get Details)        (3h/0h)          Nodes
│  X: -2208                  X: -1900                  X: -1600             X: -1320
│  Y: 0                      Y: 208                    Y: 208               Y: 208
│
│
MIDDLE
│
├─ 🎯 Trigger
│  (UI Manual)    ──────────→ 🔀 Merge
│  Position:                 (Same node)
│  X: -2208
│  Y: 416


                            AFTER "Send a message" EMAIL NODE:
                            ═════════════════════════════════
                            
                            Send Email ──────→ ✅ HTTP Callback  ──────→ Google Sheets
                                              (Backend Webhook)
                                              Position:
                                              X: 800
                                              Y: 208
```

---

## 📋 QUICK COPY-PASTE INSTRUCTIONS

### **IN N8N UI:**

1. **Delete**: Right-click "When clicking 'Execute workflow'" → Delete

2. **Add Node 1** (Top-Left):
   - Click "+" to add node
   - Search: "Execute Workflow Trigger"
   - Drag to position X: -2208, Y: 0
   - Name it: `📅 Trigger: From Meeting (Scheduled)`

3. **Add Node 2** (Bottom-Left):
   - Click "+" to add node
   - Search: "Webhook"
   - Set HTTP Method: POST
   - Set Path: `proposal-send-manual`
   - Drag to position X: -2208, Y: 416
   - Name it: `🎯 Trigger: From UI (Manual Send)`

4. **Add Node 3** (Middle-Left):
   - Click "+" to add node
   - Search: "Merge"
   - Drag to position X: -1900, Y: 208
   - Name it: `🔀 Merge: Both Triggers`

5. **Add Node 4** (Middle):
   - Click "+" to add node
   - Search: "HTTP Request"
   - Method: GET
   - URL: `https://YOUR_BACKEND_URL/api/meetings/{{$json.meeting_id}}`
   - Add Header: "Authorization" = "Bearer YOUR_TOKEN"
   - Drag to position X: -1600, Y: 208
   - Name it: `📋 HTTP: Get Meeting + Lead Details`

6. **Add Node 5** (Middle-Right):
   - Click "+" to add node
   - Search: "Wait"
   - Amount: `={{$json.source === 'scheduled' ? 3 : 0}}`
   - Unit: "hours"
   - Drag to position X: -1320, Y: 208
   - Name it: `⏱️ Wait: 3h if Scheduled`

7. **Add Node 6** (Far Right - After Email):
   - Click "+" to add node
   - Search: "HTTP Request"
   - Method: POST
   - URL: `https://YOUR_BACKEND_URL/api/proposals/webhook`
   - Add Headers:
     - "X-Callback-Secret": "0ae44ca96b5093fcd70cdf5dd7f7c705"
     - "Content-Type": "application/json"
   - Body (Raw JSON):
     ```json
     {
       "user_id": "={{$json.user_id}}",
       "meeting_id": "={{$json.meeting_id}}",
       "lead_email": "={{$json.lead_email}}",
       "lead_name": "={{$json.lead_name}}",
       "company": "={{$json.company}}",
       "proposal_json": "={{$('Message a model3').item.json}}",
       "status": "Sent"
     }
     ```
   - Drag to position X: 800, Y: 208
   - Name it: `✅ HTTP: Backend Callback Webhook`

---

## 🔗 DRAG CONNECTIONS (In Order)

```
1. 📅 Trigger (Meeting) 
   └─ Right circle ──→ Left circle of 🔀 Merge

2. 🎯 Trigger (UI)
   └─ Right circle ──→ Left circle of 🔀 Merge

3. 🔀 Merge
   └─ Right circle ──→ Left circle of 📋 HTTP Get Details

4. 📋 HTTP Get Details
   └─ Right circle ──→ Left circle of ⏱️ Wait

5. ⏱️ Wait
   └─ Right circle ──→ Left circle of "Loop Over Items"

6. "Send a message" (EMAIL)
   └─ Right circle ──→ Left circle of ✅ HTTP Callback

7. ✅ HTTP Callback
   └─ Right circle ──→ Left circle of "Append or update row in sheet"
```

---

## 🎨 VISUAL FLOW DIAGRAM

```
START
  ↓
  ├─────────────────────────────────────────────────────────────┐
  │                                                             │
  │  ┌──────────────────┐         ┌─────────────────────┐      │
  │  │ 📅 Meeting       │         │ 🎯 UI Manual Send   │      │
  │  │ (Scheduled)      │         │ (Immediate)         │      │
  │  └────────┬─────────┘         └────────┬────────────┘      │
  │           │                           │                    │
  │           └───────────────┬───────────┘                    │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ 🔀 Merge      │                        │
  │                   │ Both Triggers │                        │
  │                   └───────┬───────┘                        │
  │                           ↓                                │
  │                   ┌───────────────────────┐               │
  │                   │ 📋 Get Meeting Data   │               │
  │                   │ (Full lead + context) │               │
  │                   └───────┬───────────────┘               │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ ⏱️ Conditional │                        │
  │                   │ Wait (3h/0h)  │                        │
  │                   └───────┬───────┘                        │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ Loop Items    │                        │
  │                   │ & Process     │                        │
  │                   └───────┬───────┘                        │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ AI Analysis   │                        │
  │                   │ & Generate    │                        │
  │                   └───────┬───────┘                        │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ Send Email    │                        │
  │                   └───────┬───────┘                        │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ ✅ Backend    │                        │
  │                   │ Callback      │                        │
  │                   │ Webhook       │                        │
  │                   └───────┬───────┘                        │
  │                           ↓                                │
  │                   ┌───────────────┐                        │
  │                   │ Google Sheets │                        │
  │                   │ Log           │                        │
  │                   └───────────────┘                        │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
  
  END
```

---

## ⚡ WHAT EACH NODE DOES

| # | Node | Function | Input | Output |
|---|------|----------|-------|--------|
| 1 | 📅 Meeting Trigger | Receives call from meeting.json workflow | `{meeting_id, lead_email, meet_link, source: 'scheduled'}` | Pass through |
| 2 | 🎯 UI Manual Trigger | Receives POST from frontend button | `{meeting_id, user_id, source: 'manual'}` | Webhook payload |
| 3 | 🔀 Merge | Combines both trigger paths | Item from either node | Merged single item |
| 4 | 📋 Get Details | Fetches full meeting + lead data | `{meeting_id}` | Full context (lead_name, company, etc) |
| 5 | ⏱️ Wait | Delays scheduled, skips manual | `{source}` | After delay (3h if scheduled, 0h if manual) |
| 6 | 📋 Loop | Processes each lead item | Lead array | Individual lead items |
| 7-8 | AI + Email | Generates & sends proposal | Lead data + context | Email sent confirmation |
| 9 | ✅ Callback | Notifies backend proposal created | Generated proposal | Backend stores in DB |
| 10 | 📊 Sheets | Logs to Google Sheets | Proposal details | Row appended |

---

## 🔑 CRITICAL REPLACEMENTS

**Before testing, replace these 3 values:**

```
1. Node 4 - Get Meeting Details:
   - Replace: YOUR_BACKEND_URL
   - With: https://smady-prototype.vercel.app  (or your actual URL)
   
   - Replace: YOUR_BACKEND_API_TOKEN
   - With: Your actual bearer token

2. Node 6 - Backend Callback:
   - Replace: YOUR_BACKEND_URL
   - With: https://smady-prototype.vercel.app  (or your actual URL)
   
   - X-Callback-Secret: 0ae44ca96b5093fcd70cdf5dd7f7c705 ✅ (keep as-is)
```

---

## ✅ POST-SETUP CHECKLIST

- [ ] All 6 nodes created with correct positions
- [ ] All 7 connections drawn (see diagram above)
- [ ] URLs updated in Node 4 and Node 6
- [ ] Bearer token added to Node 4
- [ ] Test webhook trigger by clicking "Test" on Node 2
- [ ] Verify meeting workflow passes correct data to Node 1
- [ ] Save workflow in N8N

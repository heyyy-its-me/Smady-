# Google sign-in and n8n mail/calendar setup

Smady uses Google OAuth both to sign users in and to let each user authorize their own Gmail sending and Google Calendar event creation. Google refresh tokens are encrypted in the app database. n8n receives only a short-lived access token when it asks for one; it never receives or stores the user's refresh token.

## 1. Configure Google OAuth

1. In Google Cloud Console, create/select a project, enable the **Gmail API** and **Google Calendar API**, and configure the OAuth consent screen with your app name, support email, privacy policy, and authorized domains.
2. Create an OAuth client with application type **Web application**.
3. Add the exact callback URL to **Authorized redirect URIs**:
   - Local development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://YOUR-FRONTEND-DOMAIN/api/auth/google/callback`

   The frontend's same-origin `/api` rewrite forwards this request to FastAPI. Keep the URI identical to `GOOGLE_REDIRECT_URI` including scheme, hostname, and path.
4. Set these backend environment variables (use the deployment host's secret manager, not source control):
   - `GOOGLE_CLIENT_ID`: OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: OAuth client secret
   - `GOOGLE_REDIRECT_URI`: the exact callback URL above
   - `GOOGLE_TOKEN_ENCRYPTION_KEY`: a Fernet key generated with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
5. Keep `COOKIE_SECURE=true` in production. The Google callback cookie is short-lived, HttpOnly, and SameSite=Lax.
6. Deploy the backend. Its startup creates the new `google_accounts` table in `DB_SCHEMA`; no change to the shared `public.users` table or separate migration command is needed.

Google authorization is incremental: Login/Signup requests only `openid`, `email`, and `profile` for identity. A signed-in user must separately choose **Profile → Connect Google** to grant `https://www.googleapis.com/auth/gmail.send` and `https://www.googleapis.com/auth/calendar.events.owned` for email/calendar features. These scopes cover:

| Feature | Permission/API | What it allows |
|---|---|---|
| Sign in and identify the Google account | OpenID Connect (`openid`, `email`, `profile`) | Verify identity and read the user's basic profile/email. |
| Send email as the connected user | Gmail API + `gmail.send` | Send messages; it does not grant general mailbox-reading access. |
| Create calendar events and invite attendees | Calendar API + `calendar.events.owned` | Create/manage events on calendars the connected user owns; narrower than access to events on every calendar they can access. |
| Add a Google Meet link to an event | Calendar API + `calendar.events.owned`, using `conferenceDataVersion=1` and `conferenceData.createRequest` | Ask Google Calendar to attach Meet conference details to the event. **No separate Meet OAuth scope is needed for this event-based flow.** |

For this app's current “schedule an event and attach a Meet link” behavior, enable the **Gmail API** and **Google Calendar API**; Calendar's `events.insert` endpoint accepts `calendar.events.owned`, and a separate Google Meet API enablement/scope is not required. If you later use the Google Meet REST API directly to manage meeting spaces or participants outside Calendar events, enable that API and request only the corresponding additional Meet scope(s) then. Avoid requesting broader permissions before a feature needs them.

Google treats Gmail/calendar scopes as sensitive; external production users may require OAuth app verification. While the consent screen is in Testing, add test users in Google Cloud Console. Do not try to work around Google's verification requirements.

## 1A. Submit the production OAuth app for verification

For a public, external-user launch, use Google's current [submission flow](https://support.google.com/cloud/answer/13461325) and [verification requirements](https://support.google.com/cloud/answer/13464321). Google changes Console navigation occasionally; use the Verification Center links shown in your own project.

1. **Prepare a production project.** Keep development/testing and production OAuth projects separate. Set the production app's audience to External and publish it to Production when the app, site, and policies are ready. Testing mode is for listed testers and has user/token limitations; it is not a public launch path.
2. **Complete brand verification.** In Google Auth Platform → Branding, use the real app name/logo, support email, developer contact, public app homepage, privacy-policy URL, and terms URL. The homepage must be public, describe Smady (not only display a login form), and link to the same privacy policy used in the OAuth configuration. Verify every authorized domain in Search Console using an account with owner/editor access to the Cloud project.
3. **Publish verified branding, then request Data Access verification.** In Data Access, declare only the exact scopes requested by the deployed code: OIDC identity, `gmail.send`, and `calendar.events.owned`. Google classifies scopes in the Console; request the least privilege that works. The `events.insert` API accepts `calendar.events.owned`, which is why Smady uses it instead of the broader `calendar.events` scope.
4. **Provide a justification for every sensitive/restricted scope.** Explain the feature, the exact API method, why the chosen scope is needed, why a narrower scope is insufficient, and how users control the feature. Example wording to adapt (do not claim anything the product does not actually do):
   - **Gmail `gmail.send`:** “Smady uses Gmail API `users.messages.send` only when a user invokes/configures Smady's email outreach feature. It sends the user's approved message from that user's account. Smady does not read the user's mailbox. Email recipients must have consented to receive these messages, and Smady must not be used to send unsolicited bulk email.”
   - **Calendar `calendar.events.owned`:** “Smady uses Calendar API `events.insert` to create a user-requested meeting on the connected user's own primary calendar, invite the specified attendee, and request Google Meet conference data. Smady does not need access to events on calendars the user does not own; the narrower `calendar.events.owned` scope is used.”
5. **Upload a review video.** Provide an unlisted YouTube demo in English, recorded from the actual submitted app. Show the public app/brand, the entire sign-in/authorization consent flow and exact scopes, then demonstrate each scope's feature: the explicit user action and Gmail send, and Calendar event creation including the Meet link. Keep the OAuth client ID visible in the browser during the consent page as Google's review instructions request. Do not show client secrets, access/refresh tokens, or real customer data.
6. **Show policy compliance.** Link to relevant in-app feature documentation. The public privacy policy and an in-product disclosure must clearly describe Google data accessed, why/how it is used, encrypted token storage, n8n's role as a processor, sharing, retention/deletion, and how a user disconnects/revokes access. Obtain clear affirmative consent before access; a privacy-policy link alone is not a substitute for the in-product notice. Follow Google's API Services User Data Policy and Limited Use requirements.
7. **Submit and monitor.** Submit through Verification Center after branding is published. Keep project owner/editor and support contact emails monitored; Google may ask follow-up questions or request corrections.

### Important review risks and current app readiness

- **Gmail policy is a product-use gate, not just an OAuth form.** Google's [Gmail API policy](https://developers.google.com/gmail/api/policy) only approves specified user-benefiting purposes. It says CRM/bulk commercial messages are acceptable only when the recipients consented to receive them, and prohibits spam/unsolicited commercial mail. Smady's lead-outreach use must meet this requirement; if the intended use is unsolicited cold email, do not claim it is compliant in the verification request. Google can reject that use case even if the OAuth implementation works.
- **The campaign checkbox is an attestation, not proof of opt-in.** Smady now requires and records the user's confirmation that all campaign recipients consented, but it does not independently verify that consent. You still need a documented source/record for recipient consent, an unsubscribe process in the email workflow, and controls to suppress opted-out recipients. A checked box cannot make unsolicited outreach compliant.
- **Login and API consent are now separate.** Login/Signup requests only basic identity. A signed-in user must affirm the in-product disclosure and choose **Connect Google** before Smady requests Gmail/Calendar scopes. Record this exact scope sequence in the review video.
- **Legal pages are drafted, but operator details must be completed.** The Privacy Policy and Terms pages are public at `/privacy` and `/terms`, and the landing/signup links point to them. Set `VITE_LEGAL_OPERATOR_NAME` and `VITE_PRIVACY_CONTACT_EMAIL`, confirm data-provider, retention, deletion, and legal-entity details match production, and obtain jurisdiction-specific legal review. Do not submit while the pages show the missing-contact warning or contain inaccurate statements.
- **Provide real operator/contact details.** Set `VITE_LEGAL_OPERATOR_NAME` and `VITE_PRIVACY_CONTACT_EMAIL` in the frontend build environment. Use the legally responsible operator name and a monitored mailbox; do not submit while the page displays its configuration warning. The policies are product-specific drafts, not a substitute for jurisdiction-specific counsel or confirming actual retention/provider arrangements.
- **Time:** Google's docs currently say sensitive-scope review typically takes 3–5 business days; brand verification is often automated within minutes but may take 2–3 business days if manual. Follow-ups, fixes, or a restricted-scope security assessment can extend this. Treat those as typical estimates, not a guaranteed approval date. The Console's scope classification determines whether extra assessment is required.

**Practical acceptance checklist:** published and verified app identity/domains; public functional homepage; accessible, accurate privacy policy and terms; visible pre-consent explanation and affirmative user action; exact least-privilege scopes; approved Gmail use case and recipient consent; scope justifications; review video demonstrating end-to-end use; secure encrypted tokens and user disconnect/deletion flow; no outstanding Google review questions. Google makes the final decision, so passing a checklist is not a guarantee of approval.

## 2. User experience

- The Google buttons on Login/Signup create an account on first sign-in or log in an existing Google-linked account. New users receive the same app-generated UUID user ID as password signups and a personal workspace.
- A verified Google email that matches an existing Smady account is linked to that account; the existing password remains unchanged.
- Users can connect or disconnect Google under **Profile → Google account**.
- `GET /api/integrations/google/status` reports connection state and the Google email, but never returns credentials.

## 3. Replace Gmail/Calendar nodes in n8n

Do this first in a **test copy** of each workflow. App-triggered lead, outreach, and meeting webhooks include a `user_id`; use the value from the incoming item, not an email address or a hardcoded Smady account ID. The manual meeting payload includes `meeting_id`, `user_id`, `Client Name`, `Client Email`, `Meeting Date`, `Meeting Time (24hr, IST)`, `Duration (minutes)`, `Meeting Title`, and `Notes / Description`.

### A. Store the callback secret as an n8n credential

Create a Header Auth credential in n8n with header name `X-Callback-Secret` and value equal to the backend's `N8N_CALLBACK_SECRET`. Select that credential on the token and result-callback HTTP nodes. Do not paste the secret into an expression, workflow JSON, or a frontend request. Use HTTPS for these calls.

### B. Add a token HTTP Request node

Add an HTTP Request node (for example, name it `Get Google Access Token`) ahead of the Google API call:

- Method: `POST`
- URL: `https://YOUR-BACKEND-HOST/api/integrations/google/n8n-token` (recommended for server-to-server n8n calls). The frontend proxy URL also works if needed: `https://YOUR-FRONTEND-HOST/api/integrations/google/n8n-token`.
- Authentication: select the Header Auth credential above.
- Send body: on; body content type: JSON; specify body using fields/JSON.
- Body: `user_id` = `{{ $json.user_id }}`. If the node is not directly after the webhook trigger, use the actual trigger reference, such as `{{ $('Smady Webhook').first().json.user_id }}`.
- If your n8n version has **Put Output in Field**, enable it and enter `googleToken` so the original lead/meeting fields remain on the item. Otherwise, merge the token response with the original input by position before the Google node.

Expected response: `access_token`, `token_type`, `expires_at`, and `scope`. It is a short-lived bearer token; request it once near the start of an execution and reuse it for that user's Google calls. The endpoint stores/refreshes tokens on the backend and never returns a refresh token.

### C. Replace “Send Email” with Gmail API HTTP Request

The Gmail API expects `raw` to be a base64url-encoded RFC 2822/MIME message, not the usual `{to, subject, body}` object. Add a Code node before the HTTP Request node to construct it. Example (adjust incoming field names to your workflow):

```javascript
return $input.all().map((item, index) => {
   const to = String(item.json.lead_email || item.json["Client Email"] || "").trim();
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Missing or invalid recipient email");

   const subject = String(item.json.subject || "").replace(/[\r\n]+/g, " ");
   const html = String(item.json.email_html || item.json.body || "");
   const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
   const mime = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
   ].join("\r\n");
   const raw = Buffer.from(mime, "utf8").toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
   return { json: { ...item.json, raw }, pairedItem: { item: index } };
});
```

Then configure the HTTP Request node:

- Method: `POST`
- URL: `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
- Send headers: `Authorization` = `Bearer {{ $json.googleToken.access_token }}` (or the merged token field); `Content-Type` = `application/json`.
- Send body as JSON with one field: `raw` = `{{ $json.raw }}`.

Gmail sends as the connected Google user; don't set a `From` address unless it is a verified Gmail send-as alias. Map the response's `id`/`threadId` as needed. Ensure dynamic HTML content is safely escaped/sanitized by your email-template workflow.

### D. Replace Calendar/Meet nodes with Calendar API HTTP Request

Add an HTTP Request node after the token node:

- Method: `POST`
- URL (event only): `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all`
- URL (event + Google Meet): `https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1`
- Headers: same dynamic `Authorization: Bearer {{ $json.googleToken.access_token }}` (or the merged token field) and `Content-Type: application/json`.
- JSON body example:

```json
{
   "summary": "Discovery call with {{ $json['Client Name'] }}",
   "description": "{{ $json['Notes / Description'] }}",
   "start": {
      "dateTime": "{{ $json.start_rfc3339 }}",
      "timeZone": "Asia/Kolkata"
   },
   "end": {
      "dateTime": "{{ $json.end_rfc3339 }}",
      "timeZone": "Asia/Kolkata"
   },
   "attendees": [{ "email": "{{ $json['Client Email'] }}" }],
   "conferenceData": {
      "createRequest": {
         "requestId": "{{ $json.meeting_id }}",
         "conferenceSolutionKey": { "type": "hangoutsMeet" }
      }
   }
}
```

For a meeting payload with `Meeting Date` and `Meeting Time (24hr, IST)`, create `start_rfc3339` and `end_rfc3339` in a Code node before the Calendar request. This example interprets the app's meeting time as India Standard Time (UTC+05:30):

```javascript
return $input.all().map((item, index) => {
   const date = String(item.json["Meeting Date"] || "").slice(0, 10);
   const time = String(item.json["Meeting Time (24hr, IST)"] || "").padStart(5, "0");
   const duration = Number(item.json["Duration (minutes)"] || 30);
   const start = new Date(`${date}T${time}:00+05:30`);
   if (!date || Number.isNaN(start.getTime()) || !Number.isFinite(duration) || duration <= 0) {
      throw new Error("Invalid meeting date, time, or duration");
   }
   const end = new Date(start.getTime() + duration * 60_000);
   return {
      json: {
         ...item.json,
         start_rfc3339: start.toISOString(),
         end_rfc3339: end.toISOString(),
      },
      pairedItem: { item: index },
   };
});
```

Send RFC 3339 timestamps with an offset, such as `2026-11-05T08:30:00.000Z`; do not send a date-only value as `dateTime`. `requestId` must be unique per event; use `meeting_id` for Smady-created meetings. Google can take a moment to populate `hangoutLink`; use the returned event `hangoutLink` (or `htmlLink` if no Meet link was requested).

### E. Return the created link to Smady

For Smady-created meetings, add an HTTP Request node after successful event creation so the app can display the event/Meet link on the existing meeting (this updates it; it does not insert a duplicate):

- Method: `POST`
- URL: `https://YOUR-BACKEND-HOST/api/meetings/google-event-callback`
- Authentication: the same Header Auth credential (`X-Callback-Secret`).
- JSON body:

```json
{
   "meeting_id": "{{ $('Your Meeting Trigger').item.json.meeting_id }}",
   "user_id": "{{ $('Your Meeting Trigger').item.json.user_id }}",
   "meeting_link": "{{ $('Create Calendar Event').item.json.hangoutLink || $('Create Calendar Event').item.json.htmlLink }}"
}
```

Use the actual names of your trigger and Calendar HTTP Request nodes. The callback checks both IDs, sets the meeting link, and marks the meeting confirmed. Do not use the existing `/api/meetings/callback` for this: that route creates a new meeting row.

### F. Test and protect execution data

1. Connect a test user's Google account from Smady **Profile → Google account**.
2. Run the test workflow with that user's `user_id`; confirm the sent message appears in that user's Sent folder and the event/Meet link is in that user's Calendar and Smady meeting.
3. Verify a user who has not connected Google gets a clear `404`; `409` means they need to reconnect Google in Profile. Do not fall back to your personal/shared account.
4. The token response is sensitive. Avoid pinning it, redact it from logs, and configure n8n execution retention not to persist successful run data if that fits your operations. The endpoint sets `Cache-Control: no-store`.

The token endpoint is protected by the same n8n callback secret used by existing callback routes and is scoped to the supplied Smady UUID. Never expose the callback secret or access token to browser/frontend code.

## 4. Important workflow change

Remove the currently hardcoded Gmail/Calendar credentials from workflows and do not use a shared service account for tenant mail. Pass the Smady `user_id` through each workflow and request the access token for that specific user. Confirm event ownership and sender identity in a test workflow before enabling production sends.

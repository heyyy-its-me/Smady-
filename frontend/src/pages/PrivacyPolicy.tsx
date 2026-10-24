import { LegalPageLayout } from "@/pages/LegalPageLayout";

export default function PrivacyPolicy() {
  const operatorName = import.meta.env.VITE_LEGAL_OPERATOR_NAME?.trim() || "Smady";

  return (
    <LegalPageLayout title="Privacy Policy">
      <p>This policy describes how {operatorName} ("Smady," "we," "us") handles information when you use the Smady website and application. It is written for the current product features and should be reviewed and updated by the legal operator before public launch.</p>

      <section>
        <h2>1. Information we process</h2>
        <ul>
          <li><strong>Account information:</strong> name, email address, organization/workspace information, account identifiers, and authentication records needed to create and secure your account.</li>
          <li><strong>Information you provide:</strong> company/product descriptions, ideal-customer-profile and sales preferences, campaign content, meeting details, notes, and other inputs you choose to submit.</li>
          <li><strong>Lead and business information:</strong> contact details and company information that you upload, enter, or ask Smady to source/enrich. You are responsible for having a lawful basis and any required permissions to provide and use these contacts.</li>
          <li><strong>Service activity:</strong> feature usage, campaign and meeting status, timestamps, error/security records, and support communications.</li>
          <li><strong>Google identity data:</strong> if you choose “Sign in with Google,” we receive your Google account's stable subject identifier, verified email, and basic profile information to authenticate you and associate the login with your Smady account.</li>
          <li><strong>Google API authorization data:</strong> only if you separately choose **Profile → Connect Google**. We receive and store OAuth access/refresh tokens and the granted scopes so the features you request can send email through Gmail and create events/Meet links through Google Calendar. Tokens are encrypted at rest using an application-managed Fernet key. The login-only flow does not request Gmail or Calendar access.</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <ul>
          <li>Provide, maintain, and secure your account and requested Smady features.</li>
          <li>Process your business inputs and lead information to generate or organize sales research, campaign drafts, proposals, and meeting workflows.</li>
          <li>Send a message through your connected Gmail account or create/invite attendees to a Calendar event only when you configure or invoke the corresponding feature.</li>
          <li>Create a Google Meet conference link as part of a Calendar event when you request a meeting with Meet details.</li>
          <li>Store the resulting campaign/meeting status and link in Smady so you can see the outcome.</li>
          <li>Respond to support requests, prevent abuse, diagnose failures, and comply with legal obligations.</li>
        </ul>
        <p>We do not use Google API data to serve advertising, sell it, or train generalized AI/ML models. We do not use the Gmail API to read your inbox; the requested Gmail permission is for sending messages. We use Google data only for the user-facing functions described here and as permitted by Google's applicable policies.</p>
      </section>

      <section>
        <h2>3. Google data, n8n, and service providers</h2>
        <p>Google login is separate from connecting Gmail/Calendar. When you connect Google, your authorization is associated with your Smady user ID. Smady encrypts the Google tokens in its database and uses them to obtain short-lived access tokens for the relevant workflow. The configured n8n workflow may process the campaign/event details and short-lived token to perform the action you requested. Smady does not intentionally send the Google refresh token to n8n. The n8n operator's execution-data retention and logging settings are separately configured; operators must disable or redact token and personal-data retention where practical.</p>
        <p>We use service providers that operate or support the application, database, hosting, lead/AI processing, and n8n automation. They may process information only as needed to provide the configured service. Google processes data under Google's own terms and privacy policies when you authorize and use Google APIs. We do not sell Google user data or disclose it for advertising. Before launch, the operator must ensure each production provider and its retention/location settings match this policy and any required agreements.</p>
      </section>

      <section>
        <h2>4. Storage, security, and retention</h2>
        <p>Account, workspace, campaign, lead, and meeting data is stored in the application's configured database. Passwords are stored as one-way password hashes. Google OAuth tokens are encrypted at rest; connections use HTTPS in production. We use access controls and security measures intended to protect information, but no service can guarantee absolute security.</p>
        <p>We retain account and product information while needed to operate the service, meet the purposes above, resolve disputes, and comply with law. Specific retention periods for application logs, database backups, lead-provider records, and n8n executions depend on the production hosting/provider configuration and must be set and published by the operator before launch. n8n may retain workflow execution data according to its own configuration.</p>
      </section>

      <section>
        <h2>5. Your choices, access, and deletion</h2>
        <ul>
          <li>You can use basic Google sign-in without connecting Gmail/Calendar.</li>
          <li>You can disconnect Google in **Profile → Google account**. Smady attempts to revoke the Google refresh token and removes the stored integration credentials. You can also revoke Smady from your Google Account's third-party connections.</li>
          <li>You may request access, correction, or deletion of your Smady account and associated data by contacting the privacy address below. We will verify the request and explain any information we must retain by law or for security/legal purposes.</li>
          <li>You can stop a campaign or workflow before it is sent; once an email or calendar invitation has been delivered, deletion from Smady cannot retract it from recipients' accounts.</li>
        </ul>
      </section>

      <section>
        <h2>6. Email recipients and your responsibilities</h2>
        <p>Smady provides tools that can send messages to contacts you choose. You must have a lawful basis and the recipients' required consent before sending, provide any notices and opt-out mechanisms required by applicable law, honor opt-outs, and comply with Gmail's anti-abuse policies. Do not use Smady to send unsolicited messages or spam. You are responsible for the recipient lists and campaign content you provide.</p>
      </section>

      <section>
        <h2>7. Children, international use, and changes</h2>
        <p>Smady is a business productivity service and is not intended for children. Information may be processed in the countries where the operator and service providers operate. We may update this policy when the service or legal requirements change; we will update the effective date and provide any notice required by law.</p>
      </section>

      <section>
        <h2>8. Operator details that must be completed before production</h2>
        <p>The codebase does not identify the responsible legal entity, its registered address, or a monitored privacy contact. Before publishing this page or submitting OAuth verification, the operator must configure `VITE_LEGAL_OPERATOR_NAME` and `VITE_PRIVACY_CONTACT_EMAIL`, confirm the deployed homepage/domain and actual third-party providers/retention periods, and have qualified counsel review this policy for the operator's jurisdiction and business practices.</p>
      </section>
    </LegalPageLayout>
  );
}

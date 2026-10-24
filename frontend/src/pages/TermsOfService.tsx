import { LegalPageLayout } from "@/pages/LegalPageLayout";

export default function TermsOfService() {
  const operatorName = import.meta.env.VITE_LEGAL_OPERATOR_NAME?.trim() || "Smady";

  return (
    <LegalPageLayout title="Terms of Service">
      <p>These Terms govern your use of the Smady website and application. By creating an account or using the service, you agree to these Terms. If you do not agree, do not use Smady. The legal operator must complete the operator details and obtain legal review before public launch.</p>

      <section>
        <h2>1. The service</h2>
        <p>Smady provides business productivity tools for company research, lead organization, outreach preparation, proposal workflows, and meeting scheduling. Some features use automated or AI-assisted processing and third-party services. Results can be incomplete or inaccurate; you must review content and decisions before relying on or sending them.</p>
      </section>

      <section>
        <h2>2. Accounts and security</h2>
        <p>You must provide accurate account information, keep your credentials secure, and promptly notify the operator of suspected unauthorized use. You are responsible for activity performed through your account. Google sign-in authenticates your Smady account; it does not by itself connect Gmail or Calendar. You must separately authorize Google in Profile before Smady workflows can use those services.</p>
      </section>

      <section>
        <h2>3. Google and other connected services</h2>
        <p>If you connect Google, you authorize Smady to use the Gmail send and Calendar event scopes shown in Google's consent screen to perform the features you invoke. Smady does not request Gmail inbox-reading access. Calendar event creation may include attendees and Google Meet conference data. You can disconnect Google from Profile or revoke access in your Google Account. Google services remain subject to Google's terms and availability.</p>
        <p>Some actions are carried out by configured automation providers, including n8n. You instruct Smady to transmit the minimum information necessary to the selected service to complete your requested workflow. Workflow execution can fail, be delayed, or be retried; review status in Smady and avoid duplicate sends/events if a workflow reports an uncertain outcome.</p>
      </section>

      <section>
        <h2>4. Contacts, email consent, and acceptable use</h2>
        <p>You are responsible for the leads, addresses, campaign content, and instructions you submit. You represent that you have the rights and lawful basis needed to use the information and that every email recipient has expressly consented where required to receive the messages you send. You must comply with applicable privacy, marketing, consumer-protection, and anti-spam laws, provide required sender identification and unsubscribe mechanisms, and promptly honor opt-outs.</p>
        <p>You must not use Smady to send unsolicited commercial email, spam, deceptive messages, malware, or unlawful content; evade Gmail limits or abuse safeguards; upload data you are not authorized to use; or interfere with the service or another user's account. Smady may suspend campaign access when abuse or policy violations are suspected. The campaign consent checkbox records your attestation; it does not independently verify consent or make an unlawful campaign permissible.</p>
      </section>

      <section>
        <h2>5. Your content and permissions</h2>
        <p>You retain your rights to content you submit. You grant {operatorName} a limited, non-exclusive permission to host, process, transmit, and display that content as needed to provide, secure, and support the features you request. This permission ends when the content is deleted, except for temporary backups or records retained as described in the Privacy Policy or required by law.</p>
      </section>

      <section>
        <h2>6. Plans, availability, and changes</h2>
        <p>Features, limits, and pricing may change. We will communicate material changes where required. The service depends on networks and third-party APIs, so availability and delivery are not guaranteed. Google may reject, limit, or revoke access to its APIs independently of Smady.</p>
      </section>

      <section>
        <h2>7. Suspension and termination</h2>
        <p>You may stop using Smady and request account deletion through the privacy contact. The operator may suspend or terminate access for security, legal compliance, abuse, nonpayment if applicable, or material breach of these Terms. On termination, access to the account may stop; data handling is described in the Privacy Policy.</p>
      </section>

      <section>
        <h2>8. Disclaimers and liability</h2>
        <p>To the extent permitted by law, Smady is provided “as is” and “as available.” The operator does not warrant that AI-assisted research, lead data, message delivery, meeting availability, or third-party integrations will be accurate, uninterrupted, or fit for a particular purpose. You are responsible for reviewing recipients, content, and meeting details before a workflow sends or schedules them.</p>
        <p>Nothing in these Terms excludes rights or remedies that cannot lawfully be excluded. Any limitations of liability, governing law, dispute process, and statutory consumer terms must be completed by the legal operator with counsel before production publication; they are intentionally not invented here.</p>
      </section>

      <section>
        <h2>9. Operator details to complete</h2>
        <p>The codebase does not identify the responsible legal entity, registered address, governing jurisdiction, or monitored support contact. Before publishing, configure `VITE_LEGAL_OPERATOR_NAME` and `VITE_PRIVACY_CONTACT_EMAIL`, fill in the operator's legal details and jurisdiction-specific clauses, and obtain qualified legal review.</p>
      </section>
    </LegalPageLayout>
  );
}

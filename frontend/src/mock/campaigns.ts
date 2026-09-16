import type { Campaign } from "@/types";

export const campaignsMock: Campaign[] = [
  { id: "camp-1", requestId: "#REQ-1042", name: "Q3 SaaS VP Outreach", leadsCount: 240, status: "Sent", sentDate: "2026-07-08", subject: "Quick question about {company}'s outbound", body: "Hi {first_name}, ..." },
  { id: "camp-2", requestId: "#REQ-1041", name: "Fintech CRO Sequence", leadsCount: 180, status: "Sending", sentDate: "2026-07-10", subject: "Helping {company} book more demos", body: "Hi {first_name}, ..." },
  { id: "camp-3", requestId: "#REQ-1040", name: "Healthtech Growth Leads", leadsCount: 120, status: "Sent", sentDate: "2026-07-05", subject: "Idea for {company}'s pipeline", body: "Hi {first_name}, ..." },
  { id: "camp-4", requestId: "#REQ-1039", name: "Retail Founders Batch 2", leadsCount: 95, status: "Failed", sentDate: "2026-07-03", subject: "Following up, {first_name}", body: "Hi {first_name}, ..." },
  { id: "camp-5", requestId: "#REQ-1038", name: "Logistics RevOps List", leadsCount: 150, status: "Queued", sentDate: "2026-07-12", subject: "For {company}'s revenue team", body: "Hi {first_name}, ..." },
  { id: "camp-6", requestId: "#REQ-1037", name: "Manufacturing Directors", leadsCount: 210, status: "Sent", sentDate: "2026-06-29", subject: "A faster way to book meetings", body: "Hi {first_name}, ..." },
];

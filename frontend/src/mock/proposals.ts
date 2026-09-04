import type { Proposal } from "@/types";

export const proposalsMock: Proposal[] = [
  { id: "prop-1", leadName: "Daniel Osei", company: "Ferro Systems", generatedDate: "2026-07-09", status: "Needs Review", content: "Hi Daniel, based on Ferro Systems' current outbound gaps, we propose a 3-month Smady rollout covering ICP refinement, automated sourcing of 500 verified leads/month, and meeting scheduling automation. Expected impact: 2.3x more booked demos." },
  { id: "prop-2", leadName: "Isabella Rossi", company: "Harborlight SaaS", generatedDate: "2026-07-08", status: "Approved", content: "Hi Isabella, we've drafted a growth package for Harborlight SaaS focused on scaling qualified pipeline via automated sequencing and AI-assisted meeting booking, with a dedicated success check-in every two weeks." },
  { id: "prop-3", leadName: "Grace Kim", company: "Anchor Biotech", generatedDate: "2026-07-07", status: "Sent", content: "Hi Grace, attached is our proposal for Anchor Biotech covering ICP-matched sourcing across US and EU markets, bulk outreach automation, and proposal generation for closed-won accounts." },
  { id: "prop-4", leadName: "Priya Sharma", company: "Cascade Ventures", generatedDate: "2026-07-06", status: "Needs Review", content: "Hi Priya, here is a tailored proposal for Cascade Ventures focused on reducing manual prospecting time by automating lead sourcing and follow-up sequencing across your target segments." },
  { id: "prop-5", leadName: "Marcus Chen", company: "Brightline Robotics", generatedDate: "2026-07-04", status: "Approved", content: "Hi Marcus, this proposal outlines how Smady can support Brightline Robotics' Series B growth plan with automated ICP-based sourcing and a dedicated outbound playbook." },
];

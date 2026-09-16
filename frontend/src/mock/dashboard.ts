import type { StatDatum } from "@/types";

export const leadsGrowth: StatDatum[] = [
  { label: "Jan", value: 120 }, { label: "Feb", value: 138 }, { label: "Mar", value: 152 },
  { label: "Apr", value: 149 }, { label: "May", value: 168 }, { label: "Jun", value: 190 },
  { label: "Jul", value: 205 }, { label: "Aug", value: 224 }, { label: "Sep", value: 293 },
  { label: "Oct", value: 260 }, { label: "Nov", value: 278 }, { label: "Dec", value: 301 },
];

export const emailsSentComparison = {
  percent: 33,
  trend: "up" as const,
  thisWeek: [40, 55, 48, 62, 58, 70, 65],
  lastWeek: [30, 38, 35, 44, 40, 50, 46],
  totalPerWeek: 398,
};

export const replyRateComparison = {
  percent: -12,
  trend: "down" as const,
  thisWeek: [18, 15, 20, 14, 16, 12, 13],
  lastWeek: [22, 20, 24, 19, 21, 18, 20],
  totalPerWeek: 108,
};

export const dashboardStats = {
  leadsToday: { value: 48, sparkline: [12, 18, 15, 22, 28, 34, 48] },
  totalLeads: { value: 3260, sparkline: [2800, 2900, 2950, 3050, 3120, 3200, 3260] },
  emailsSent: { value: 9840, sparkline: [7200, 7600, 8100, 8500, 9000, 9400, 9840] },
  meetingsBooked: { value: 142, sparkline: [90, 98, 105, 112, 120, 133, 142] },
};

export const pipelineFunnel = [
  { stage: "New Leads", value: 320 },
  { stage: "Contacted", value: 238 },
  { stage: "Interested", value: 142 },
  { stage: "Meeting Booked", value: 68 },
];

export const leadSourceBreakdown = [
  { name: "Agent Sourced", value: 62 },
  { name: "Uploaded", value: 24 },
  { name: "Referral", value: 14 },
];

export const activityFeed: { id: string; type: "meeting" | "email" | "lead" | "reply" | "proposal"; title: string; subtitle: string; time: string }[] = [
  { id: "act-1", type: "meeting", title: "Meeting booked with Daniel Osei", subtitle: "Ferro Systems · Auto-booked by agent", time: "2m ago" },
  { id: "act-2", type: "email", title: "Sequence email sent to 24 leads", subtitle: "Campaign: Q3 SaaS Outbound", time: "18m ago" },
  { id: "act-3", type: "lead", title: "12 new leads sourced", subtitle: "Matched ICP: B2B SaaS · United States", time: "1h ago" },
  { id: "act-4", type: "reply", title: "Priya Sharma replied — Interested", subtitle: "Cascade Ventures", time: "2h ago" },
  { id: "act-5", type: "proposal", title: "Proposal approved for Northwind Analytics", subtitle: "Sent to Ava Thompson", time: "5h ago" },
  { id: "act-6", type: "meeting", title: "Meeting booked with Isabella Rossi", subtitle: "Harborlight SaaS", time: "1d ago" },
];

export const funnelData = [
  { stage: "Leads", value: 1000 },
  { stage: "Contacted", value: 640 },
  { stage: "Replied", value: 310 },
  { stage: "Meeting Booked", value: 140 },
  { stage: "Proposal Sent", value: 78 },
  { stage: "Won", value: 34 },
];

export const outreachOverTime = [
  { label: "Feb", sent: 420, opened: 260, replied: 80 },
  { label: "Mar", sent: 480, opened: 300, replied: 95 },
  { label: "Apr", sent: 510, opened: 330, replied: 110 },
  { label: "May", sent: 560, opened: 360, replied: 118 },
  { label: "Jun", sent: 610, opened: 400, replied: 132 },
  { label: "Jul", sent: 690, opened: 460, replied: 150 },
];

export const leadsByCountry = [
  { name: "United States", value: 42 },
  { name: "United Kingdom", value: 18 },
  { name: "India", value: 15 },
  { name: "Germany", value: 13 },
  { name: "Canada", value: 12 },
];

export const leadsByIndustry = [
  { name: "SaaS", value: 38 },
  { name: "Fintech", value: 22 },
  { name: "Healthtech", value: 17 },
  { name: "E-commerce", value: 14 },
  { name: "Manufacturing", value: 9 },
];

export const meetingConversion = {
  percent: 18,
  trend: "up" as const,
  thisWeek: [8, 10, 9, 12, 11, 14, 15],
  lastWeek: [6, 8, 7, 9, 8, 11, 12],
  totalPerWeek: 79,
};

export const campaignPerformance = [
  { campaign: "Q3 SaaS VP Outreach", contacted: 240, openRate: "58%", replyRate: "14%", meetings: 22, proposals: 9, won: 4 },
  { campaign: "Fintech CRO Sequence", contacted: 180, openRate: "61%", replyRate: "17%", meetings: 19, proposals: 8, won: 3 },
  { campaign: "Healthtech Growth Leads", contacted: 120, openRate: "54%", replyRate: "12%", meetings: 11, proposals: 5, won: 2 },
  { campaign: "Retail Founders Batch 2", contacted: 95, openRate: "47%", replyRate: "9%", meetings: 6, proposals: 2, won: 1 },
  { campaign: "Manufacturing Directors", contacted: 210, openRate: "52%", replyRate: "11%", meetings: 15, proposals: 6, won: 2 },
];

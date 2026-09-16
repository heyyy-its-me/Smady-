import type { StatDatum } from "@/types";

export const weeklyEmailsSent: StatDatum[] = [
  { label: "Mon", value: 120 },
  { label: "Tue", value: 145 },
  { label: "Wed", value: 132 },
  { label: "Thu", value: 168 },
  { label: "Fri", value: 190 },
  { label: "Sat", value: 60 },
  { label: "Sun", value: 40 },
];

export const outreachStats = {
  emailsSent: { value: 9840, sparkline: [7200, 7600, 8100, 8500, 9000, 9400, 9840] },
  openRate: { value: 58, sparkline: [50, 52, 54, 55, 56, 57, 58] },
  replyRate: { value: 14, sparkline: [10, 11, 12, 12, 13, 13, 14] },
  bounceRate: { value: 3, sparkline: [5, 4, 4, 4, 3, 3, 3] },
};

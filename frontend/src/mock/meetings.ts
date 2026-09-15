import type { Meeting } from "@/types";

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const meetingsMock: Meeting[] = [
  { id: "meet-1", lead_name: "Ava Thompson", company: "Northwind Analytics", date: iso(1), time: "10:00 AM", status: "Confirmed", link: "https://meet.smady.ai/ava-thompson" },
  { id: "meet-2", lead_name: "Daniel Osei", company: "Ferro Systems", date: iso(2), time: "2:30 PM", status: "Auto-Booked", link: "https://meet.smady.ai/daniel-osei" },
  { id: "meet-3", lead_name: "Isabella Rossi", company: "Harborlight SaaS", date: iso(3), time: "11:00 AM", status: "Confirmed", link: "https://meet.smady.ai/isabella-rossi" },
  { id: "meet-4", lead_name: "Priya Sharma", company: "Cascade Ventures", date: iso(4), time: "4:00 PM", status: "Pending Reply", link: "https://meet.smady.ai/priya-sharma" },
  { id: "meet-5", lead_name: "Grace Kim", company: "Anchor Biotech", date: iso(-1), time: "9:30 AM", status: "Confirmed", link: "https://meet.smady.ai/grace-kim" },
  { id: "meet-6", lead_name: "Marcus Chen", company: "Brightline Robotics", date: iso(6), time: "1:00 PM", status: "Auto-Booked", link: "https://meet.smady.ai/marcus-chen" },
  { id: "meet-7", lead_name: "Noah Bennett", company: "Meridian Retail", date: iso(9), time: "3:15 PM", status: "Pending Reply", link: "https://meet.smady.ai/noah-bennett" },
  { id: "meet-8", lead_name: "Nadia Petrova", company: "Solace Financial", date: iso(12), time: "10:45 AM", status: "Confirmed", link: "https://meet.smady.ai/nadia-petrova" },
];

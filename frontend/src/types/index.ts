export type LeadStatus = "New" | "Contacted" | "Interested" | "Meeting Booked" | "Verified" | "Churned";

export interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  email: string;
  linkedin: string;
  status: LeadStatus;
  source: "Agent" | "Uploaded";
  about: string;
  assigned: string[];
  sequenceProgress: number;
}

export type CampaignStatus = "Queued" | "Sending" | "Sent" | "Failed";

export interface Campaign {
  id: string;
  requestId: string;
  name: string;
  leadsCount: number;
  status: CampaignStatus;
  sentDate: string;
  subject?: string;
  body?: string;
}

export type MeetingStatus = "Confirmed" | "Pending Reply" | "Auto-Booked";

export interface Meeting {
  id: string;
  leadName: string;
  company: string;
  date: string;
  time: string;
  status: MeetingStatus;
  link: string;
}

export type ProposalStatus = "Needs Review" | "Approved" | "Sent";

export interface Proposal {
  id: string;
  leadName: string;
  company: string;
  generatedDate: string;
  status: ProposalStatus;
  content: string;
}

export interface ICPResult {
  industry: string[];
  targetRoles: string[];
  companySize: string[];
  geography: string[];
  painPoints: string[];
}

export interface User {
  name: string;
  email: string;
  company: string;
  plan: string;
}

export interface StatDatum {
  label: string;
  value: number;
}

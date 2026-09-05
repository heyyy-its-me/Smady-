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

export interface ICPScoreCard {
  icp: string;
  pain_severity: number;
  market_size: number;
  ease_of_sales: number;
  score: number;
}

export interface ICPResult {
  analysis: {
    company_name: string;
    product_name: string;
    positioning: string;
    differentiator: string;
    industries: string[];
    core_problem: string;
    buyer_pain: string;
    technical_complexity: string;
    recommended_segment: string;
  };
  gtm_strategy: {
    target_countries: string[];
    target_regions: string[];
    recommended_channels: string[];
  };
  primary_icp: ICPScoreCard;
  secondary_icps: ICPScoreCard[];
  buyer_persona: {
    role: string[];
    pain_points: string[];
    goals: string[];
  };
  confidence_score: number;
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

export interface HistoryItem {
  request_id: string;
  type: "icp" | "leads" | "outreach" | "meeting" | "proposal";
  status: string;
  title: string;
  created_at: string;
}

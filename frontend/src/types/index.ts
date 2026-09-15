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
  leadRunId?: string | null;
  leadScore?: number | null;
  priority?: string;
  icpMatch?: string;
  icpTier?: string;
  seniority?: string;
  employees?: string;
  foundedYear?: string;
  fundingStage?: string;
  annualRevenue?: string;
  technologies?: string;
  specialties?: string;
  location?: string;
  phone?: string;
  industry?: string;
  companyDescription?: string;
  personalizationHook?: string;
  painPointsMatched?: string;
  recommendedAction?: string;
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
  user_id: string;
  request_id: string | null;
  lead_name: string;
  lead_email: string;
  meeting_date: string;
  meeting_link: string | null;
  status: MeetingStatus;
  source: "agent" | "manual";
  notes: string | null;
  created_at: string;
}

export type ProposalStatus = "needs_review" | "Needs Review" | "sent" | "Sent" | "Approved" | "Rejected" | "webhook_not_configured" | "sent_after_revision" | "pending";

export interface Proposal {
  id: string | number;   // INTEGER for n8n rows, UUID string for app rows
  meeting_id?: string | null;
  user_id?: string;
  request_id?: string | null;
  lead_name?: string;
  lead_email?: string;
  proposal_json?: Record<string, unknown>;
  guardrail_errors: string[];
  reviewer_issues: string[];
  reviewer_approved?: boolean;
  final_status: string;
  created_at: string;
  context_json?: Record<string, unknown> | null;
  // Extracted from proposal_json
  package_selected?: string | null;
  quoted_price?: number | null;
  valid_until?: string | null;
  subject?: string | null;
  body_html?: string | null;
  is_revision?: boolean;
}

export interface ReviewQueue {
  review_queue: Proposal[];
  app_proposals: Proposal[];
}

export interface PricingPackage {
  id: number;
  package_name: string;
  floor_price: number;
  ceiling_price: number;
  includes: string;
  valid_days: number;
}

export interface ICPResult {
  industry: string[];
  targetRoles: string[];
  companySize: string[];
  geography: string[];
  painPoints: string[];
  positioning?: string;
  differentiator?: string;
  coreProblem?: string;
  buyerPain?: string;
  confidenceScore?: number;
  gtmChannels?: string[];
  gtmRegions?: string[];
  secondaryIcps?: { icp: string; score: number }[];
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

export interface LeadRunHistory {
  id: string;
  request_id: string;
  type: "leads";
  status: string;
  filters: Record<string, unknown>;
  lead_count: number;
  created_at: string;
}

export interface IcpHistory {
  id: string;
  request_id: string;
  type: "icp";
  status: string;
  created_at: string;
}

export interface CampaignHistory {
  id: string;
  request_id: string;
  type: "outreach";
  name: string;
  status: string;
  leads_count: number;
  created_at: string;
}

export interface HistoryData {
  lead_runs: LeadRunHistory[];
  icp_profiles: IcpHistory[];
  campaigns: CampaignHistory[];
}

export interface RealHistoryItem {
  id: string;
  type: "icp" | "leads" | "meeting" | "proposal";
  label: string;
  status: string;
  created_at: string | null;
}

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Lead, Campaign, Meeting, Proposal, ICPResult, HistoryItem } from "@/types";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/sonner";

const emptyStat = { value: 0, sparkline: [0, 0, 0, 0, 0, 0, 0] };
const emptyComparison = { percent: 0, trend: "up" as const, thisWeek: [0, 0, 0, 0, 0, 0, 0], lastWeek: [0, 0, 0, 0, 0, 0, 0], totalPerWeek: 0 };

interface DashboardStats {
  leadsToday: { value: number; sparkline: number[] };
  totalLeads: { value: number; sparkline: number[] };
  emailsSent: { value: number; sparkline: number[] };
  meetingsBooked: { value: number; sparkline: number[] };
  leadsGrowth: { label: string; value: number }[];
  pipelineFunnel: { stage: string; value: number }[];
  leadSourceBreakdown: { name: string; value: number }[];
  activityFeed: { id: string; type: string; title: string; subtitle: string; time: string }[];
  emailsSentComparison: typeof emptyComparison;
  replyRateComparison: typeof emptyComparison;
}

interface OutreachStats {
  emailsSent: { value: number; sparkline: number[] };
  openRate: { value: number; sparkline: number[] };
  replyRate: { value: number; sparkline: number[] };
  bounceRate: { value: number; sparkline: number[] };
  weeklyEmailsSent: { label: string; value: number }[];
}

const defaultDashboardStats: DashboardStats = {
  leadsToday: emptyStat,
  totalLeads: emptyStat,
  emailsSent: emptyStat,
  meetingsBooked: emptyStat,
  leadsGrowth: [],
  pipelineFunnel: [],
  leadSourceBreakdown: [],
  activityFeed: [],
  emailsSentComparison: emptyComparison,
  replyRateComparison: emptyComparison,
};

const defaultOutreachStats: OutreachStats = {
  emailsSent: emptyStat,
  openRate: emptyStat,
  replyRate: emptyStat,
  bounceRate: emptyStat,
  weeklyEmailsSent: [],
};

const NOT_CONFIGURED_MESSAGES: Record<string, string> = {
  icp: "ICP engine webhook isn't configured yet. Add N8N_ICP_WEBHOOK_URL to run this live.",
  leads: "Lead sourcing webhook isn't configured yet. Add N8N_LEADS_WEBHOOK_URL to run this live.",
  meetings: "Meeting scheduler webhook isn't configured yet. Add MEETINGS_WEBHOOK_URL to run this live.",
  proposals: "Proposal generator webhook isn't configured yet. Add PROPOSAL_WEBHOOK_URL to run this live.",
};

async function pollUntilDone(url: string, intervalMs = 3000, maxAttempts = 100): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await api.get(url);
    if (data?.status && data.status !== "pending") return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for a response");
}

interface AppDataContextType {
  icp: ICPResult | null;
  generatingIcp: boolean;
  generateIcp: (input: Record<string, unknown>) => Promise<void>;
  fetchIcpByRequestId: (requestId: string) => Promise<void>;

  leads: Lead[];
  generatingLeads: boolean;
  generateLeads: (filters: Record<string, unknown>) => Promise<void>;
  uploadLeads: (count: number) => Promise<void>;
  sendToOutreach: (ids: string[]) => Promise<void>;
  refreshLeads: (requestId?: string) => Promise<void>;

  campaigns: Campaign[];
  addCampaign: (data: { name: string; subject: string; body: string; recipientSource?: string }) => Promise<void>;

  meetings: Meeting[];
  scheduleMeeting: (data: { leadId?: string; clientName: string; clientEmail: string; date: string; time: string; durationMinutes: number; title: string; notes?: string }) => Promise<void>;
  schedulingMeeting: boolean;

  proposals: Proposal[];
  generatingProposal: boolean;
  generateProposal: (data: { leadId?: string; leadName: string; company: string; notes: string }) => Promise<void>;
  approveProposal: (id: string) => Promise<void>;
  rejectProposal: (id: string) => Promise<void>;

  dashboardStats: DashboardStats;
  outreachStats: OutreachStats;
  refreshDashboard: () => Promise<void>;
  refreshOutreachStats: () => Promise<void>;

  history: HistoryItem[];
  refreshHistory: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth();
  const [icp, setIcp] = useState<ICPResult | null>(null);
  const [generatingIcp, setGeneratingIcp] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [outreachStats, setOutreachStats] = useState<OutreachStats>(defaultOutreachStats);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const refreshLeads = useCallback(async (requestId?: string) => {
    const { data } = await api.get("/leads", { params: requestId ? { request_id: requestId } : {} });
    setLeads(data);
  }, []);

  const refreshCampaigns = useCallback(async () => {
    const { data } = await api.get("/outreach/campaigns");
    setCampaigns(data);
  }, []);

  const refreshMeetings = useCallback(async () => {
    const { data } = await api.get("/meetings");
    setMeetings(data);
  }, []);

  const refreshProposals = useCallback(async () => {
    const { data } = await api.get("/proposals/pending");
    setProposals(data);
  }, []);

  const refreshDashboard = useCallback(async () => {
    const { data } = await api.get("/dashboard/stats");
    setDashboardStats(data);
  }, []);

  const refreshOutreachStats = useCallback(async () => {
    const { data } = await api.get("/outreach/stats");
    setOutreachStats(data);
  }, []);

  const refreshHistory = useCallback(async () => {
    const { data } = await api.get("/history");
    setHistory(data);
  }, []);

  const fetchLatestIcp = useCallback(async () => {
    const { data } = await api.get("/icp/latest");
    if (data?.status === "completed" && data.result) setIcp(data.result);
  }, []);

  const fetchIcpByRequestId = async (requestId: string) => {
    try {
      const { data } = await api.get(`/icp/status/${requestId}`);
      if (data.result) setIcp(data.result);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refreshLeads().catch(() => {});
    refreshCampaigns().catch(() => {});
    refreshMeetings().catch(() => {});
    refreshProposals().catch(() => {});
    refreshDashboard().catch(() => {});
    refreshOutreachStats().catch(() => {});
    refreshHistory().catch(() => {});
    fetchLatestIcp().catch(() => {});
  }, [authLoading, isAuthenticated, refreshLeads, refreshCampaigns, refreshMeetings, refreshProposals, refreshDashboard, refreshOutreachStats, refreshHistory, fetchLatestIcp]);

  const generateIcp = async (input: Record<string, unknown>) => {
    setGeneratingIcp(true);
    try {
      const { data } = await api.post("/icp/generate", input);
      if (data.status === "webhook_not_configured") {
        toast.error(NOT_CONFIGURED_MESSAGES.icp);
        return;
      }
      if (data.status === "completed" && data.result) {
        setIcp(data.result);
      } else {
        toast.error("ICP generation failed. Please try again.");
      }
      refreshHistory().catch(() => {});
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setGeneratingIcp(false);
    }
  };

  const generateLeads = async (filters: Record<string, unknown>) => {
    setGeneratingLeads(true);
    try {
      const { data } = await api.post("/leads/generate", filters);
      if (data.status === "webhook_not_configured") {
        toast.error(NOT_CONFIGURED_MESSAGES.leads);
        return;
      }
      await pollUntilDone(`/leads/status/${data.request_id}`);
      await refreshLeads();
      await refreshDashboard();
      refreshHistory().catch(() => {});
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setGeneratingLeads(false);
    }
  };

  const uploadLeads = async (count: number) => {
    try {
      await api.post("/leads/upload", { count });
      await refreshLeads();
      await refreshDashboard();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const sendToOutreach = async (ids: string[]) => {
    try {
      await api.post("/leads/send-to-outreach", { ids });
      setLeads((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, status: "Contacted" as const } : l)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addCampaign = async (data: { name: string; subject: string; body: string; recipientSource?: string }) => {
    try {
      const { data: campaign } = await api.post("/outreach/campaigns", data);
      setCampaigns((prev) => [campaign, ...prev]);
      if (campaign.status === "Failed") {
        toast.error("Outreach webhook isn't configured yet. Add N8N_OUTREACH_WEBHOOK_URL to send campaigns live.");
      } else {
        toast.success("Campaign sent");
      }
      await refreshOutreachStats();
      await refreshDashboard();
      refreshHistory().catch(() => {});
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const scheduleMeeting = async (data: { leadId?: string; clientName: string; clientEmail: string; date: string; time: string; durationMinutes: number; title: string; notes?: string }) => {
    setSchedulingMeeting(true);
    try {
      const { data: resp } = await api.post("/meetings/schedule", {
        lead_id: data.leadId || null,
        client_name: data.clientName,
        client_email: data.clientEmail,
        meeting_date: data.date,
        meeting_time: data.time,
        duration_minutes: data.durationMinutes,
        meeting_title: data.title,
        notes: data.notes,
      });
      if (resp.status === "webhook_not_configured") {
        toast.error(NOT_CONFIGURED_MESSAGES.meetings);
        await refreshMeetings();
        return;
      }
      toast.success("Meeting request sent — awaiting confirmation");
      await refreshMeetings();
      refreshHistory().catch(() => {});
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const generateProposal = async (data: { leadId?: string; leadName: string; company: string; notes: string }) => {
    setGeneratingProposal(true);
    try {
      const { data: resp } = await api.post("/proposals/generate", {
        lead_id: data.leadId || null, leadName: data.leadName, company: data.company, notes: data.notes,
      });
      if (resp.status === "webhook_not_configured") {
        toast.error(NOT_CONFIGURED_MESSAGES.proposals);
        return;
      }
      await pollUntilDone(`/proposals/status/${resp.request_id}`);
      await refreshProposals();
      toast.success("Proposal drafted");
      refreshHistory().catch(() => {});
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setGeneratingProposal(false);
    }
  };

  const approveProposal = async (id: string) => {
    try {
      await api.post(`/proposals/${id}/approve`);
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approved" as const } : p)));
      toast.success("Proposal approved");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const rejectProposal = async (id: string) => {
    try {
      await api.post(`/proposals/${id}/reject`);
      setProposals((prev) => prev.filter((p) => p.id !== id));
      toast.success("Proposal rejected");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <AppDataContext.Provider
      value={{
        icp,
        generatingIcp,
        generateIcp,
        fetchIcpByRequestId,
        leads,
        generatingLeads,
        generateLeads,
        uploadLeads,
        sendToOutreach,
        refreshLeads,
        campaigns,
        addCampaign,
        meetings,
        scheduleMeeting,
        schedulingMeeting,
        proposals,
        generatingProposal,
        generateProposal,
        approveProposal,
        rejectProposal,
        dashboardStats,
        outreachStats,
        refreshDashboard,
        refreshOutreachStats,
        history,
        refreshHistory,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

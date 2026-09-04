import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Lead, Campaign, Meeting, Proposal, ICPResult } from "@/types";
import { meetingsMock } from "@/mock/meetings";
import { proposalsMock } from "@/mock/proposals";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/sonner";

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

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

  leads: Lead[];
  generatingLeads: boolean;
  generateLeads: (filters: Record<string, unknown>) => Promise<void>;
  uploadLeads: (count: number) => Promise<void>;
  sendToOutreach: (ids: string[]) => Promise<void>;

  campaigns: Campaign[];
  addCampaign: (data: { name: string; subject: string; body: string; recipientSource?: string }) => Promise<void>;

  meetings: Meeting[];
  addMeeting: (m: Omit<Meeting, "id">) => void;

  proposals: Proposal[];
  generatingProposal: boolean;
  generateProposal: (data: { leadName: string; company: string; notes: string }) => Promise<void>;
  approveProposal: (id: string) => void;
  rejectProposal: (id: string) => void;

  dashboardStats: DashboardStats;
  outreachStats: OutreachStats;
  refreshDashboard: () => Promise<void>;
  refreshOutreachStats: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth();
  const [icp, setIcp] = useState<ICPResult | null>(null);
  const [generatingIcp, setGeneratingIcp] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>(meetingsMock);
  const [proposals, setProposals] = useState<Proposal[]>(proposalsMock);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [outreachStats, setOutreachStats] = useState<OutreachStats>(defaultOutreachStats);

  const refreshLeads = useCallback(async () => {
    const { data } = await api.get("/leads");
    setLeads(data);
  }, []);

  const refreshCampaigns = useCallback(async () => {
    const { data } = await api.get("/outreach/campaigns");
    setCampaigns(data);
  }, []);

  const refreshDashboard = useCallback(async () => {
    const { data } = await api.get("/dashboard/stats");
    setDashboardStats(data);
  }, []);

  const refreshOutreachStats = useCallback(async () => {
    const { data } = await api.get("/outreach/stats");
    setOutreachStats(data);
  }, []);

  const fetchLatestIcp = useCallback(async () => {
    const { data } = await api.get("/icp/latest");
    if (data?.status === "completed" && data.result) setIcp(data.result);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refreshLeads().catch(() => {});
    refreshCampaigns().catch(() => {});
    refreshDashboard().catch(() => {});
    refreshOutreachStats().catch(() => {});
    fetchLatestIcp().catch(() => {});
  }, [authLoading, isAuthenticated, refreshLeads, refreshCampaigns, refreshDashboard, refreshOutreachStats, fetchLatestIcp]);

  const generateIcp = async (input: Record<string, unknown>) => {
    setGeneratingIcp(true);
    try {
      const { data } = await api.post("/icp/generate", input);
      if (data.status === "webhook_not_configured") {
        toast.error("ICP engine webhook isn't configured yet. Add N8N_ICP_WEBHOOK_URL to run this live.");
        return;
      }
      const result = await pollUntilDone(`/icp/status/${data.request_id}`);
      if (result.status === "completed" && result.result) {
        setIcp(result.result);
      } else {
        toast.error("ICP generation failed. Please try again.");
      }
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
        toast.error("Lead sourcing webhook isn't configured yet. Add N8N_LEADS_WEBHOOK_URL to run this live.");
        return;
      }
      await pollUntilDone(`/leads/status/${data.request_id}`);
      await refreshLeads();
      await refreshDashboard();
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
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addMeeting = (m: Omit<Meeting, "id">) => {
    setMeetings((prev) => [{ ...m, id: nextId("meet") }, ...prev]);
  };

  const generateProposal = async (data: { leadName: string; company: string; notes: string }) => {
    setGeneratingProposal(true);
    await new Promise((r) => setTimeout(r, 1800));
    const proposal: Proposal = {
      id: nextId("prop"),
      leadName: data.leadName,
      company: data.company,
      generatedDate: new Date().toISOString().slice(0, 10),
      status: "Needs Review",
      content: `Hi ${data.leadName.split(" ")[0]}, based on our conversation with ${data.company}, we propose a tailored Smady outbound package covering ICP refinement, automated sourcing, and meeting scheduling. ${data.notes}`,
    };
    setProposals((prev) => [proposal, ...prev]);
    setGeneratingProposal(false);
  };

  const approveProposal = (id: string) =>
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approved" as const } : p)));
  const rejectProposal = (id: string) => setProposals((prev) => prev.filter((p) => p.id !== id));

  return (
    <AppDataContext.Provider
      value={{
        icp,
        generatingIcp,
        generateIcp,
        leads,
        generatingLeads,
        generateLeads,
        uploadLeads,
        sendToOutreach,
        campaigns,
        addCampaign,
        meetings,
        addMeeting,
        proposals,
        generatingProposal,
        generateProposal,
        approveProposal,
        rejectProposal,
        dashboardStats,
        outreachStats,
        refreshDashboard,
        refreshOutreachStats,
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

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import type { Lead, Campaign, Meeting, Proposal, ReviewQueue, PricingPackage, ICPResult, HistoryData, RealHistoryItem } from "@/types";
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
  proposalsSent: { value: number; sparkline: number[] };
  leadsGrowth: { label: string; value: number }[];
  pipelineFunnel: { stage: string; value: number }[];
  icpsGeneratedDaily: { label: string; value: number }[];
  activityFeed: { id: string; type: string; title: string; subtitle: string; time: string }[];
  emailsSentComparison: typeof emptyComparison;
  proposalsSentComparison: typeof emptyComparison;
  dailyActivity: Record<string, number>;
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
  proposalsSent: emptyStat,
  leadsGrowth: [],
  pipelineFunnel: [],
  icpsGeneratedDaily: [],
  activityFeed: [],
  emailsSentComparison: emptyComparison,
  proposalsSentComparison: emptyComparison,
  dailyActivity: {},
};

const defaultOutreachStats: OutreachStats = {
  emailsSent: emptyStat,
  openRate: emptyStat,
  replyRate: emptyStat,
  bounceRate: emptyStat,
  weeklyEmailsSent: [],
};

// ─── Smart Polling ────────────────────────────────────────────────────────────
// Phase-based intervals optimised for a 3-8 minute background job:
//   0-1 min  → poll every 20 s  (don't hammer on start)
//   1-3 min  → poll every 15 s  (gentle ramp-up)
//   3-8 min  → poll every  5 s  (peak expected completion window)
//   >8 min   → poll every 20 s  (back-off after likely delay)
// After 15 minutes total: invoke onTimeout and throw so the caller can
// surface a manual "Check Again" button instead of polling forever.
async function smartPoll(
  url: string,
  onTimeout: () => void,
  signal?: AbortSignal
): Promise<any> {
  const start = Date.now();
  const MAX_MS = 15 * 60 * 1000; // 15 minutes

  const getDelay = (elapsed: number): number => {
    if (elapsed < 60_000) return 20_000;   // 0–1 min  → 20 s
    if (elapsed < 180_000) return 15_000;  // 1–3 min  → 15 s
    if (elapsed < 480_000) return 5_000;   // 3–8 min  →  5 s
    return 20_000;                          // >8 min   → 20 s
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      signal?.addEventListener(
        "abort",
        () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); },
        { once: true }
      );
    });

  // Pause polling while the tab is hidden; resume as soon as it's visible again.
  const waitForVisible = () =>
    new Promise<void>((resolve) => {
      if (!document.hidden) return resolve();
      const handler = () => {
        if (!document.hidden) {
          document.removeEventListener("visibilitychange", handler);
          resolve();
        }
      };
      document.addEventListener("visibilitychange", handler);
      signal?.addEventListener(
        "abort",
        () => { document.removeEventListener("visibilitychange", handler); resolve(); },
        { once: true }
      );
    });

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const elapsed = Date.now() - start;
    if (elapsed >= MAX_MS) {
      onTimeout();
      throw new Error("Polling timed out after 15 minutes");
    }

    await waitForVisible();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const { data } = await api.get(url);
    if (data?.status && data.status !== "pending") return data;

    await sleep(getDelay(Date.now() - start));
  }
}
// ─────────────────────────────────────────────────────────────────────────────

interface AppDataContextType {
  icp: ICPResult | null;
  generatingIcp: boolean;
  icpTimedOut: boolean;
  pendingIcpRequestId: string | null;
  generateIcp: (input: Record<string, unknown>) => Promise<void>;
  checkIcpAgain: () => Promise<void>;

  leads: Lead[];
  leadsTotal: number;
  leadsRunId: string | null;
  leadsVerifiedCount: number;
  leadsReadyCount: number;
  generatingLeads: boolean;
  leadsTimedOut: boolean;
  pendingLeadsRequestId: string | null;
  generateLeads: (filters: Record<string, unknown>) => Promise<void>;
  checkLeadsAgain: () => Promise<void>;
  uploadLeads: (count: number) => Promise<void>;
  sendToOutreach: (ids: string[]) => Promise<void>;
  sendRunToOutreach: (runId: string) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  refreshLeads: (runId?: string, offset?: number, limit?: number) => Promise<void>;

  campaigns: Campaign[];
  addCampaign: (data: { name: string; subject: string; body: string; recipientSource?: string; runId?: string }) => Promise<void>;

  meetings: Meeting[];
  refreshMeetings: () => Promise<void>;
  scheduleMeeting: (data: { lead_name: string; lead_email: string; meeting_date: string; meeting_time?: string; duration?: number; title?: string; meeting_link?: string; notes?: string }) => Promise<void>;

  proposals: Proposal[];
  reviewQueue: Proposal[];
  pricingPackages: PricingPackage[];
  generatingProposal: boolean;
  generateProposal: (data: { lead_name: string; lead_email: string; proposal_template: string; proposal_subject: string; proposal_body: string; quoted_price: number; valid_days?: number; key_points?: string }) => Promise<void>;
  approveProposal: (id: string | number) => Promise<void>;
  rejectProposal: (id: string | number, feedback: string) => Promise<void>;
  createPricingPackage: (data: { package_name: string; floor_price: number; ceiling_price: number; includes?: string; valid_days?: number; active?: boolean }) => Promise<void>;
  updatePricingPackage: (id: number, data: Partial<{ package_name: string; floor_price: number; ceiling_price: number; includes: string; valid_days: number; active: boolean }>) => Promise<void>;
  deletePricingPackage: (id: number) => Promise<void>;

  dashboardStats: DashboardStats;
  outreachStats: OutreachStats;
  refreshDashboard: () => Promise<void>;
  refreshOutreachStats: () => Promise<void>;

  history: HistoryData | null;
  fetchHistory: () => Promise<void>;
  realHistory: RealHistoryItem[];
  fetchRealHistory: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth();
  const [icp, setIcp] = useState<ICPResult | null>(null);
  const [generatingIcp, setGeneratingIcp] = useState(false);
  const [icpTimedOut, setIcpTimedOut] = useState(false);
  const [pendingIcpRequestId, setPendingIcpRequestId] = useState<string | null>(null);
  const icpAbortRef = useRef<AbortController | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsRunId, setLeadsRunId] = useState<string | null>(null);
  const [leadsVerifiedCount, setLeadsVerifiedCount] = useState(0);
  const [leadsReadyCount, setLeadsReadyCount] = useState(0);
  const [generatingLeads, setGeneratingLeads] = useState(false);
  const [leadsTimedOut, setLeadsTimedOut] = useState(false);
  const [pendingLeadsRequestId, setPendingLeadsRequestId] = useState<string | null>(null);
  const leadsAbortRef = useRef<AbortController | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reviewQueue, setReviewQueue] = useState<Proposal[]>([]);
  const [pricingPackages, setPricingPackages] = useState<PricingPackage[]>([]);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [outreachStats, setOutreachStats] = useState<OutreachStats>(defaultOutreachStats);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [realHistory, setRealHistory] = useState<RealHistoryItem[]>([]);

  const refreshLeads = useCallback(async (runId?: string, offset = 0, limit = 50) => {
    const params = new URLSearchParams();
    if (runId) params.set("run_id", runId);
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    const { data } = await api.get(`/leads?${params.toString()}`);
    setLeads(data.leads);
    setLeadsTotal(data.total);
    setLeadsRunId(data.run_id);
    setLeadsVerifiedCount(data.verified_count || 0);
    setLeadsReadyCount(data.ready_count || 0);
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

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/history");
      setHistory(data);
    } catch (_e) {
      // History fetch errors are non-critical
    }
  }, []);

  const fetchRealHistory = useCallback(async () => {
    try {
      const { data } = await api.get("/history");
      setRealHistory(data);
    } catch (_e) {
      // History fetch errors are non-critical
    }
  }, []);

  const refreshMeetings = useCallback(async () => {
    const { data } = await api.get("/meetings");
    setMeetings(data);
  }, []);

  const refreshProposals = useCallback(async () => {
    const { data } = await api.get("/proposals");
    setReviewQueue(data.review_queue || []);
    setProposals([...(data.review_queue || []), ...(data.app_proposals || [])]);
    // Also fetch pricing packages
    try {
      const { data: pkgs } = await api.get("/proposals/packages");
      setPricingPackages(pkgs || []);
    } catch (_e) { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refreshLeads().catch(() => {});
    refreshCampaigns().catch(() => {});
    refreshDashboard().catch(() => {});
    refreshOutreachStats().catch(() => {});
    fetchLatestIcp().catch(() => {});
    refreshMeetings().catch(() => {});
    refreshProposals().catch(() => {});
  }, [authLoading, isAuthenticated, refreshLeads, refreshCampaigns, refreshDashboard, refreshOutreachStats, fetchLatestIcp, refreshMeetings, refreshProposals]);

  // Re-fetch dashboard + meetings when tab regains focus (calendar / live updates)
  useEffect(() => {
    const onFocus = () => {
      if (!isAuthenticated) return;
      refreshDashboard().catch(() => {});
      refreshMeetings().catch(() => {});
      refreshProposals().catch(() => {});
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refreshDashboard, refreshMeetings, refreshProposals]);

  // Proposals arrive asynchronously from n8n, so poll periodically to pick up new rows
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      refreshProposals().catch(() => {});
    }, 20000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshProposals]);

  const generateIcp = async (input: Record<string, unknown>) => {
    icpAbortRef.current?.abort();
    icpAbortRef.current = new AbortController();
    setGeneratingIcp(true);
    setIcpTimedOut(false);
    try {
      const { data } = await api.post("/icp/generate", input);
      if (data.status === "webhook_not_configured") {
        toast.error("ICP engine webhook isn't configured yet. Add N8N_ICP_WEBHOOK_URL to run this live.");
        return;
      }
      setPendingIcpRequestId(data.request_id);
      const result = await smartPoll(
        `/icp/status/${data.request_id}`,
        () => setIcpTimedOut(true),
        icpAbortRef.current.signal
      );
      setPendingIcpRequestId(null);
      if (result.status === "completed" && result.result) {
        setIcp(result.result);
      } else {
        toast.error("ICP generation failed. Please try again.");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e instanceof Error && e.message.startsWith("Polling timed out")) return;
      toast.error(formatApiError(e));
    } finally {
      setGeneratingIcp(false);
    }
  };

  const checkIcpAgain = async () => {
    if (!pendingIcpRequestId) return;
    icpAbortRef.current?.abort();
    icpAbortRef.current = new AbortController();
    setIcpTimedOut(false);
    setGeneratingIcp(true);
    try {
      const result = await smartPoll(
        `/icp/status/${pendingIcpRequestId}`,
        () => setIcpTimedOut(true),
        icpAbortRef.current.signal
      );
      setPendingIcpRequestId(null);
      if (result.status === "completed" && result.result) setIcp(result.result);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e instanceof Error && e.message.startsWith("Polling timed out")) return;
      toast.error(formatApiError(e));
    } finally {
      setGeneratingIcp(false);
    }
  };

  const generateLeads = async (filters: Record<string, unknown>) => {
    leadsAbortRef.current?.abort();
    leadsAbortRef.current = new AbortController();
    setGeneratingLeads(true);
    setLeadsTimedOut(false);
    try {
      const { data } = await api.post("/leads/generate", filters);
      if (data.status === "webhook_not_configured") {
        toast.error("Lead sourcing webhook isn't configured yet. Add N8N_LEADS_WEBHOOK_URL to run this live.");
        return;
      }
      setPendingLeadsRequestId(data.request_id);
      await smartPoll(
        `/leads/status/${data.request_id}`,
        () => setLeadsTimedOut(true),
        leadsAbortRef.current.signal
      );
      setPendingLeadsRequestId(null);
      await refreshLeads();
      await refreshDashboard();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e instanceof Error && e.message.startsWith("Polling timed out")) return;
      toast.error(formatApiError(e));
    } finally {
      setGeneratingLeads(false);
    }
  };

  const checkLeadsAgain = async () => {
    if (!pendingLeadsRequestId) return;
    leadsAbortRef.current?.abort();
    leadsAbortRef.current = new AbortController();
    setLeadsTimedOut(false);
    setGeneratingLeads(true);
    try {
      await smartPoll(
        `/leads/status/${pendingLeadsRequestId}`,
        () => setLeadsTimedOut(true),
        leadsAbortRef.current.signal
      );
      setPendingLeadsRequestId(null);
      await refreshLeads();
      await refreshDashboard();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e instanceof Error && e.message.startsWith("Polling timed out")) return;
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
      const { data } = await api.post("/leads/send-to-outreach", { ids });
      setLeads((prev) => prev.map((l) => (ids.includes(l.id) ? { ...l, status: "Contacted" as const } : l)));
      toast.success(data.message || "Lead sent to outreach");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const sendRunToOutreach = async (runId: string) => {
    try {
      const { data } = await api.post(`/leads/runs/${runId}/send-to-outreach`);
      toast.success(data.message);
      setLeads((prev) => prev.map((l) => (l.leadRunId === runId ? { ...l, status: "Contacted" as const } : l)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    try {
      const { data } = await api.patch(`/leads/${id}`, patch);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
      toast.success("Lead updated");
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await api.delete(`/leads/${id}`);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setLeadsTotal((prev) => Math.max(0, prev - 1));
      toast.success("Lead deleted");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addCampaign = async (data: { name: string; subject: string; body: string; recipientSource?: string; runId?: string }) => {
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

  const addMeeting = async (m: { lead_name: string; lead_email: string; meeting_date: string; meeting_time?: string; duration?: number; title?: string; meeting_link?: string; notes?: string }) => {
    try {
      await api.post("/meetings/schedule", m);
      await refreshMeetings();
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  const generateProposal = async (data: { lead_name: string; lead_email: string; proposal_template: string; proposal_subject: string; proposal_body: string; quoted_price: number; valid_days?: number; key_points?: string }) => {
    setGeneratingProposal(true);
    try {
      const { data: proposal } = await api.post("/proposals/generate", data);
      setProposals((prev) => [proposal, ...prev]);
      if (proposal.final_status === "webhook_not_configured") {
        toast.error("Proposal webhook isn't configured yet. Add N8N_PROPOSALS_WEBHOOK_URL to draft proposals live.");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setGeneratingProposal(false);
    }
  };

  const approveProposal = async (id: string | number) => {
    try {
      const { data } = await api.post(`/proposals/${id}/approve`);
      await refreshProposals();
      // Show appropriate message based on n8n status
      if (data?.n8n_status === 404) {
        toast.warning(
          "Marked approved locally — activate the 'Proposal Agent' workflow in n8n to send the email automatically.",
          { duration: 8000 }
        );
      } else if (data?.n8n_status === 200) {
        toast.success("Proposal approved and sent to lead via n8n");
      } else {
        toast.success("Proposal approved");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const rejectProposal = async (id: string | number, feedback: string) => {
    try {
      const { data } = await api.post(`/proposals/${id}/reject`, { feedback });
      await refreshProposals();
      if (data?.n8n_status === 200) {
        toast.success("Feedback submitted — n8n will regenerate the proposal");
      } else if (data?.n8n_status) {
        toast.warning(
          "Marked rejected locally — activate the 'Proposal Agent' workflow in n8n to enable automatic regeneration.",
          { duration: 8000 }
        );
      } else {
        toast.success("Proposal marked for revision");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const createPricingPackage = async (data: { package_name: string; floor_price: number; ceiling_price: number; includes?: string; valid_days?: number; active?: boolean }) => {
    try {
      await api.post("/proposals/packages", data);
      await refreshProposals();
      toast.success("Pricing plan created");
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  const updatePricingPackage = async (id: number, data: Partial<{ package_name: string; floor_price: number; ceiling_price: number; includes: string; valid_days: number; active: boolean }>) => {
    try {
      await api.put(`/proposals/packages/${id}`, data);
      await refreshProposals();
      toast.success("Pricing plan updated");
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  const deletePricingPackage = async (id: number) => {
    try {
      await api.delete(`/proposals/packages/${id}`);
      await refreshProposals();
      toast.success("Pricing plan deleted");
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  return (
    <AppDataContext.Provider
      value={{
        icp,
        generatingIcp,
        icpTimedOut,
        pendingIcpRequestId,
        generateIcp,
        checkIcpAgain,
        leads,
        leadsTotal,
        leadsRunId,
        leadsVerifiedCount,
        leadsReadyCount,
        generatingLeads,
        leadsTimedOut,
        pendingLeadsRequestId,
        generateLeads,
        checkLeadsAgain,
        uploadLeads,
        sendToOutreach,
        sendRunToOutreach,
        updateLead,
        deleteLead,
        refreshLeads,
        campaigns,
        addCampaign,
        meetings,
        refreshMeetings,
        scheduleMeeting: addMeeting,
        proposals,
        reviewQueue,
        pricingPackages,
        generatingProposal,
        generateProposal,
        approveProposal,
        rejectProposal,
        createPricingPackage,
        updatePricingPackage,
        deletePricingPackage,
        dashboardStats,
        outreachStats,
        refreshDashboard,
        refreshOutreachStats,
        history,
        fetchHistory,
        realHistory,
        fetchRealHistory,
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

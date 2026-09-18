import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { ButtonOutline } from "@/components/smady/Button";
import { FunnelChartCard, MultiLineChartCard, DonutChartCard, BarChartCard } from "@/components/smady/Charts";
import { ComparisonCard } from "@/components/smady/ComparisonCard";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { StatusBadge } from "@/components/smady/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { funnelData, outreachOverTime, leadsByCountry, leadsByIndustry, meetingConversion, campaignPerformance } from "@/mock/reports";
import { toast } from "@/components/ui/sonner";
import { useAppData } from "@/context/AppDataContext";
import { api, formatApiError } from "@/lib/api";
import type { RealHistoryItem } from "@/types";

interface CampaignRow {
  id: string;
  name: string;
  emails: number;
  meetings: number;
  proposals: number;
  won: number;
}

export default function Reports() {
  const { history, fetchHistory, realHistory, fetchRealHistory } = useAppData();
  const navigate = useNavigate();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContent, setDetailContent] = useState<Record<string, unknown> | null>(null);
  const [detailType, setDetailType] = useState<"icp" | "leads" | null>(null);

  // Pagination state
  const [executionHistoryPage, setExecutionHistoryPage] = useState(0);
  const [realHistoryPage, setRealHistoryPage] = useState(0);
  const [campaignPage, setCampaignPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  // Real analytics state — falls back to mock data if unavailable
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/analytics");
      setAnalytics(data);
    } catch (_e) {
      // Falls back to mock data silently
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchRealHistory();
    fetchAnalytics();
  }, [fetchHistory, fetchRealHistory, fetchAnalytics]);

  // Use real data when available, fall back to mock
  const realFunnel = analytics ? (analytics.funnel as typeof funnelData) : funnelData;
  const realOutreach = analytics ? (analytics.outreach_over_time as Array<{label: string; [key: string]: string | number}>) : outreachOverTime.map((d: Record<string, unknown>) => ({
    label: String(d.label || ""),
    sent: typeof d.sent === 'number' ? d.sent : 0
  }));
  const realByCountry = analytics ? (analytics.leads_by_country as typeof leadsByCountry) : leadsByCountry;
  const realByIndustry = analytics ? (analytics.leads_by_industry as typeof leadsByIndustry) : leadsByIndustry;
  const realMeetingConv = analytics ? (analytics.meeting_conversion as typeof meetingConversion) : meetingConversion;
  const realCampaigns = analytics ? (analytics.campaign_performance as typeof campaignPerformance) : campaignPerformance;
  
  // Proposals Lifecycle data for line chart (from analytics or fallback to mock)
  const proposalsTimeSeriesData = analytics ? (analytics.proposals_this_month as Array<{
    label: string;
    generated: number;
    sent: number;
    accepted: number;
    pending: number;
  }>) : [
    { label: "Week 1", generated: 14, sent: 9, accepted: 6, pending: 3 },
    { label: "Week 2", generated: 18, sent: 12, accepted: 8, pending: 4 },
    { label: "Week 3", generated: 22, sent: 16, accepted: 11, pending: 5 },
    { label: "Week 4", generated: 28, sent: 21, accepted: 15, pending: 7 },
  ];

  const rows = (realCampaigns || []).map((c, i) => ({
    id: (c as Record<string, unknown>).id ? String((c as Record<string, unknown>).id) : `cp-${i}`,
    ...(c as Record<string, unknown>)
  })) as CampaignRow[];

  // Unified history rows (lead runs + ICP + campaigns), sorted by date
  const allHistoryRows = [
    ...(history?.lead_runs ?? []).map((r) => ({
      hid: r.id,
      request_id: r.request_id,
      type: "leads" as const,
      label: `Lead Run · ${r.lead_count} leads`,
      status: r.status,
      date: r.created_at,
    })),
    ...(history?.icp_profiles ?? []).map((r) => ({
      hid: r.id,
      request_id: r.request_id,
      type: "icp" as const,
      label: "ICP Profile Generated",
      status: r.status,
      date: r.created_at,
    })),
    ...(history?.campaigns ?? []).map((r) => ({
      hid: r.id,
      request_id: r.request_id,
      type: "outreach" as const,
      label: `Campaign: ${r.name}`,
      status: r.status,
      date: r.created_at,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  type HistoryRow = (typeof allHistoryRows)[number];

  // Pagination calculations
  const totalExecutionHistory = allHistoryRows.length;
  const totalRealHistory = realHistory.length;
  const totalCampaigns = rows.length;

  const executionHistoryStart = executionHistoryPage * ITEMS_PER_PAGE;
  const executionHistoryEnd = executionHistoryStart + ITEMS_PER_PAGE;
  const paginatedExecutionHistory = allHistoryRows.slice(executionHistoryStart, executionHistoryEnd);

  const realHistoryStart = realHistoryPage * ITEMS_PER_PAGE;
  const realHistoryEnd = realHistoryStart + ITEMS_PER_PAGE;
  const paginatedRealHistory = realHistory.slice(realHistoryStart, realHistoryEnd);

  const campaignStart = campaignPage * ITEMS_PER_PAGE;
  const campaignEnd = campaignStart + ITEMS_PER_PAGE;
  const paginatedCampaigns = rows.slice(campaignStart, campaignEnd);

  const openRealHistoryRow = async (row: RealHistoryItem) => {
    if (row.type === "meeting") {
      navigate("/meetings");
      return;
    }
    if (row.type === "proposal") {
      navigate("/proposals");
      return;
    }
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailContent(null);
    setDetailType(row.type);
    try {
      const endpoint = row.type === "icp" ? `/company-profiles/${row.id}` : `/lead-results/${row.id}`;
      const { data } = await api.get(endpoint);
      setDetailContent(data);
    } catch (e) {
      toast.error(formatApiError(e));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const realHistoryColumns: Column<RealHistoryItem>[] = [
    {
      key: "type",
      label: "Type",
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
            r.type === "leads" ? "bg-primary-50 text-primary-600" : r.type === "icp" ? "bg-emerald-50 text-emerald-700" : r.type === "meeting" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"
          }`}
        >
          {r.type}
        </span>
      ),
    },
    { key: "label", label: "Details", render: (r) => <span className="text-sm font-medium text-ink">{r.label}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "date",
      label: "Date",
      render: (r) => <span className="text-sm text-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}</span>,
    },
    {
      key: "action",
      label: "",
      render: (r) => (
        <button
          onClick={() => openRealHistoryRow(r)}
          className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-100"
          data-testid={`real-history-view-${r.id}`}
        >
          View <Eye className="h-3 w-3" strokeWidth={1.5} />
        </button>
      ),
    },
  ];

  const campaignColumns: Column<CampaignRow>[] = [
    { key: "name", label: "Campaign Name", render: (r) => <span className="text-sm font-semibold text-ink">{r.name}</span> },
    { key: "emails", label: "Emails Sent", render: (r) => <span className="text-sm font-medium text-body">{r.emails}</span> },
    { key: "meetings", label: "Meetings Booked", render: (r) => <span className="text-sm text-body">{r.meetings}</span> },
    { key: "proposals", label: "Proposals Sent", render: (r) => <span className="text-sm text-body">{r.proposals}</span> },
    { key: "won", label: "Won", render: (r) => <span className="text-sm font-semibold text-success">{r.won}</span> },
  ];

  const historyColumns: Column<HistoryRow>[] = [
    {
      key: "type",
      label: "Type",
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            r.type === "leads"
              ? "bg-primary-50 text-primary-600"
              : r.type === "icp"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-sky-50 text-sky-700"
          }`}
        >
          {r.type === "leads" ? "Leads Run" : r.type === "icp" ? "ICP" : "Outreach"}
        </span>
      ),
    },
    { key: "label", label: "Details", render: (r) => <span className="text-sm font-medium text-ink">{r.label}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span className="text-sm text-muted">
          {new Date(r.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </span>
      ),
    },
    {
      key: "action",
      label: "",
      render: (r) =>
        r.type === "leads" ? (
          <button
            onClick={() => navigate(`/leads?request_id=${r.request_id}`)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-100"
            data-testid={`history-view-leads-${r.hid}`}
          >
            View Leads <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          </button>
        ) : null,
    },
  ];

  return (
    <div data-testid="reports-page">
      <PageHeader
        actions={
          <>
            <ButtonOutline data-testid="reports-date-range-button">Last 30 Days ▾</ButtonOutline>
            <ButtonOutline icon={<Download className="h-4 w-4" strokeWidth={1.5} />} onClick={() => toast.success("Report downloaded")} data-testid="reports-download-button">
              Download Report
            </ButtonOutline>
          </>
        }
      />

      {/* Execution History — click leads rows to drill in */}
      {allHistoryRows.length > 0 && (
        <div className="mb-6 rounded-2xl bg-surface p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">Execution History</h2>
          <p className="mt-1 text-xs text-muted">All agent runs, ICP profiles, and campaigns — click a Leads Run to view its contacts.</p>
          <div className="mt-4">
            <DataTable columns={historyColumns} rows={paginatedExecutionHistory} testId="reports-history-table" />
          </div>
          {totalExecutionHistory > ITEMS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted">
                Page {executionHistoryPage + 1} of {Math.ceil(totalExecutionHistory / ITEMS_PER_PAGE)} • {totalExecutionHistory} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setExecutionHistoryPage(Math.max(0, executionHistoryPage - 1))}
                  disabled={executionHistoryPage === 0}
                  className="rounded-lg bg-bg px-3 py-1.5 text-xs font-semibold text-body disabled:opacity-50 hover:enabled:bg-border transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setExecutionHistoryPage(executionHistoryPage + 1)}
                  disabled={executionHistoryEnd >= totalExecutionHistory}
                  className="rounded-lg bg-bg px-3 py-1.5 text-xs font-semibold text-body disabled:opacity-50 hover:enabled:bg-border transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real data history — company_profiles / lead_results / meetings / proposal_results */}
      {realHistory.length > 0 && (
        <div className="mb-6 rounded-2xl bg-surface p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">Meetings &amp; Proposals History</h2>
          <p className="mt-1 text-xs text-muted">Real ICP, leads, meetings, and proposal activity for your account — click View to inspect (isolated per account/login).</p>
          <div className="mt-4">
            <DataTable columns={realHistoryColumns} rows={paginatedRealHistory} testId="real-history-table" />
          </div>
          {totalRealHistory > ITEMS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted">
                Page {realHistoryPage + 1} of {Math.ceil(totalRealHistory / ITEMS_PER_PAGE)} • {totalRealHistory} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setRealHistoryPage(Math.max(0, realHistoryPage - 1))}
                  disabled={realHistoryPage === 0}
                  className="rounded-lg bg-bg px-3 py-1.5 text-xs font-semibold text-body disabled:opacity-50 hover:enabled:bg-border transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setRealHistoryPage(realHistoryPage + 1)}
                  disabled={realHistoryEnd >= totalRealHistory}
                  className="rounded-lg bg-bg px-3 py-1.5 text-xs font-semibold text-body disabled:opacity-50 hover:enabled:bg-border transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Grid - Structured Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <DonutChartCard title="Leads by Industry" data={realByIndustry} testId="reports-industry-donut" />
        <DonutChartCard title="Leads by Country" data={realByCountry} testId="reports-country-donut" />
        <ComparisonCard
          title="Meeting Conversion Rate"
          percent={realMeetingConv.percent}
          trend={realMeetingConv.trend}
          thisWeek={realMeetingConv.thisWeek}
          lastWeek={realMeetingConv.lastWeek}
          totalPerWeek={realMeetingConv.totalPerWeek}
        />
      </div>

      {/* Proposals Lifecycle */}
      <div className="mt-6">
        <MultiLineChartCard
          title="Proposals Lifecycle"
          subtitle={analytics ? "This month" : "Sample data"}
          data={proposalsTimeSeriesData}
          testId="reports-proposals-lifecycle"
        />
      </div>

      {/* Outreach Analytics - Side by Side with Enhanced Design */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Emails Sent Over Time */}
        <div className="relative rounded-2xl overflow-hidden shadow-card">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 to-primary-25/40" />
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary-100">
                <TrendingUp className="h-5 w-5 text-primary-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Emails Sent Over Time</h3>
                <p className="text-xs text-muted mt-0.5">Campaign email delivery trends</p>
              </div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 -mx-6 -mb-6 mx-6 mb-6">
              <MultiLineChartCard 
                title="" 
                data={(analytics?.emailsOverTime as Array<{date: string; emails: number}>) ?? realOutreach.map((d: Record<string, unknown>) => ({
                  label: String(d.label || ""),
                  emails: typeof d.sent === 'number' ? d.sent : 0
                }))} 
                testId="reports-outreach-chart"
                className="!bg-transparent !shadow-none !p-0"
              />
            </div>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="relative rounded-2xl overflow-hidden shadow-card">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-emerald-25/40" />
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <BarChart3 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Campaign Performance</h3>
                <p className="text-xs text-muted mt-0.5">Emails sent per campaign</p>
              </div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 -mx-6 -mb-6 mx-6 mb-6">
              <BarChartCard
                title=""
                data={((analytics?.campaignPerformance as Array<{name: string; emails: number}>) ?? []).map(c => ({
                  label: c.name,
                  value: c.emails
                }))}
                testId="reports-campaign-performance"
                className="!bg-transparent !shadow-none !p-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Campaign Performance</h2>
        <div className="mt-4">
          <DataTable columns={campaignColumns} rows={paginatedCampaigns} testId="reports-campaign-table" />
        </div>
        {totalCampaigns > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted">
              Page {campaignPage + 1} of {Math.ceil(totalCampaigns / ITEMS_PER_PAGE)} • {totalCampaigns} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCampaignPage(Math.max(0, campaignPage - 1))}
                disabled={campaignPage === 0}
                className="rounded-lg bg-bg px-3 py-1.5 text-xs font-semibold text-body disabled:opacity-50 hover:enabled:bg-border transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setCampaignPage(campaignPage + 1)}
                disabled={campaignEnd >= totalCampaigns}
                className="rounded-lg bg-bg px-3 py-1.5 text-xs font-semibold text-body disabled:opacity-50 hover:enabled:bg-border transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl" data-testid="real-history-detail-modal">
          <DialogHeader>
            <DialogTitle>{detailType === "icp" ? "Company Profile" : "Lead Run Results"}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : detailType === "leads" ? (
            <LeadsDetailView content={detailContent} />
          ) : (
            <CompanyProfileDetailView content={detailContent} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadsDetailView({ content }: { content: Record<string, unknown> | null }) {
  if (!content) return null;
  const leadsArr = Array.isArray(content.leads) ? (content.leads as Record<string, unknown>[]) : [];
  const pick = (l: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) if (l[k]) return String(l[k]);
    return "—";
  };
  return (
    <div data-testid="leads-detail-view">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>
          Total leads: <strong className="text-ink">{String(content.total_count ?? leadsArr.length)}</strong>
        </span>
        <StatusBadge status={String(content.status || "")} />
      </div>
      <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border" data-testid="leads-detail-scroll-area">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-bg text-[11px] font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">ICP Match</th>
              <th className="px-4 py-3">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leadsArr.map((l, i) => (
              <tr key={i} className="hover:bg-bg/60" data-testid={`leads-detail-row-${i}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{pick(l, ["Contact Name", "name"])}</p>
                  <p className="text-xs text-muted">{pick(l, ["Designation", "title"])}</p>
                </td>
                <td className="px-4 py-3 text-body">{pick(l, ["Company Name", "company"])}</td>
                <td className="px-4 py-3 text-body">{pick(l, ["Email", "email"])}</td>
                <td className="px-4 py-3 font-semibold text-primary-600">{pick(l, ["Lead Score", "score"])}</td>
                <td className="px-4 py-3 text-body">{pick(l, ["ICP Match"])}</td>
                <td className="px-4 py-3 text-body">{pick(l, ["Location", "Country"])}</td>
              </tr>
            ))}
            {leadsArr.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No lead rows in this run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompanyProfileDetailView({ content }: { content: Record<string, unknown> | null }) {
  if (!content) return null;
  const fields: [string, unknown][] = [
    ["Company", content.company_name],
    ["Product", content.product_name],
    ["Positioning", content.positioning],
    ["Differentiator", content.differentiator],
    ["Core Problem", content.core_problem],
    ["Buyer Pain", content.buyer_pain],
    ["Target Segment", content.target_segment],
    ["Confidence Score", content.confidence_score != null ? `${content.confidence_score}` : null],
  ].filter(([, v]) => v) as [string, unknown][];
  return (
    <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1" data-testid="company-profile-detail-view">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{String(value)}</p>
        </div>
      ))}
      {fields.length === 0 && <p className="text-sm text-muted">No profile data yet for this record.</p>}
    </div>
  );
}

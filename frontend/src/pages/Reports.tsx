import { Download, Target, Users, Mail, Calendar, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/layouts/PageHeader";
import { ButtonOutline } from "@/components/smady/Button";
import { FunnelChartCard, MultiLineChartCard, DonutChartCard } from "@/components/smady/Charts";
import { ComparisonCard } from "@/components/smady/ComparisonCard";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { StatusBadge } from "@/components/smady/Badge";
import { funnelData, outreachOverTime, leadsByCountry, leadsByIndustry, meetingConversion, campaignPerformance } from "@/mock/reports";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";
import type { HistoryItem } from "@/types";

interface CampaignRow {
  id: string;
  campaign: string;
  contacted: number;
  openRate: string;
  replyRate: string;
  meetings: number;
  proposals: number;
  won: number;
}

const historyIcons: Record<HistoryItem["type"], typeof Target> = {
  icp: Target,
  leads: Users,
  outreach: Mail,
  meeting: Calendar,
  proposal: FileText,
};

const historyPaths: Record<HistoryItem["type"], (id: string) => string> = {
  icp: (id) => `/icp?request_id=${id}`,
  leads: (id) => `/leads?request_id=${id}`,
  outreach: (id) => `/outreach?request_id=${id}`,
  meeting: (id) => `/meetings?id=${id}`,
  proposal: (id) => `/proposals?id=${id}`,
};

export default function Reports() {
  const { history } = useAppData();
  const navigate = useNavigate();
  const historyRows = history.map((h) => ({ ...h, id: `${h.type}-${h.request_id}` }));
  const rows: CampaignRow[] = campaignPerformance.map((c, i) => ({ id: `cp-${i}`, ...c }));

  const tableColumns: Column<CampaignRow>[] = [
    { key: "campaign", label: "Campaign", sortable: true, render: (r) => <span className="text-sm font-semibold text-ink">{r.campaign}</span> },
    { key: "contacted", label: "Leads Contacted", render: (r) => <span className="text-sm text-body">{r.contacted}</span> },
    { key: "openRate", label: "Open Rate", render: (r) => <span className="text-sm text-body">{r.openRate}</span> },
    { key: "replyRate", label: "Reply Rate", render: (r) => <span className="text-sm text-body">{r.replyRate}</span> },
    { key: "meetings", label: "Meetings Booked", render: (r) => <span className="text-sm text-body">{r.meetings}</span> },
    { key: "proposals", label: "Proposals Sent", render: (r) => <span className="text-sm text-body">{r.proposals}</span> },
    { key: "won", label: "Won", render: (r) => <span className="text-sm font-semibold text-success">{r.won}</span> },
  ];

  const historyColumns: Column<HistoryItem & { id: string }>[] = [
    {
      key: "type",
      label: "Type",
      render: (h) => {
        const Icon = historyIcons[h.type];
        return (
          <span className="flex items-center gap-2 text-sm text-body">
            <Icon className="h-4 w-4 text-primary-500" strokeWidth={1.5} />
            {h.type}
          </span>
        );
      },
    },
    { key: "title", label: "Description", render: (h) => <span className="text-sm text-body">{h.title}</span> },
    { key: "status", label: "Status", render: (h) => <StatusBadge status={h.status} /> },
    { key: "created_at", label: "Timestamp", render: (h) => <span className="text-sm text-muted">{new Date(h.created_at).toLocaleString()}</span> },
    {
      key: "view",
      label: "",
      render: (h) => (
        <button
          className="text-sm font-semibold text-primary-500 hover:underline"
          onClick={() => navigate(historyPaths[h.type](h.request_id))}
          data-testid={`history-view-${h.request_id}`}
        >
          View
        </button>
      ),
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FunnelChartCard title="Outbound Funnel" subtitle="Leads to closed-won" data={funnelData} testId="reports-funnel-chart" />
        <MultiLineChartCard title="Outreach Performance Over Time" subtitle="Sent, opened, and replied" data={outreachOverTime} testId="reports-performance-chart" />
        <DonutChartCard title="Leads by Country" data={leadsByCountry} testId="reports-country-donut" />
        <DonutChartCard title="Leads by Industry" data={leadsByIndustry} testId="reports-industry-donut" />
        <ComparisonCard
          title="Meeting Conversion Rate"
          percent={meetingConversion.percent}
          trend={meetingConversion.trend}
          thisWeek={meetingConversion.thisWeek}
          lastWeek={meetingConversion.lastWeek}
          totalPerWeek={meetingConversion.totalPerWeek}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Previous Runs</h2>
        <div className="mt-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted" data-testid="reports-history-empty">No activity yet. Runs from ICP, Leads, Outreach, Meetings and Proposals will show up here.</p>
          ) : (
            <DataTable columns={historyColumns} rows={historyRows} testId="reports-history-table" />
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Campaign Performance</h2>
        <div className="mt-4">
          <DataTable columns={tableColumns} rows={rows} testId="reports-campaign-table" />
        </div>
      </div>
    </div>
  );
}

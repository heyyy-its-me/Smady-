import { Download } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { ButtonOutline } from "@/components/smady/Button";
import { FunnelChartCard, MultiLineChartCard, DonutChartCard } from "@/components/smady/Charts";
import { ComparisonCard } from "@/components/smady/ComparisonCard";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { funnelData, outreachOverTime, leadsByCountry, leadsByIndustry, meetingConversion, campaignPerformance } from "@/mock/reports";
import { toast } from "@/components/ui/sonner";

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

export default function Reports() {
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
        <h2 className="text-[15px] font-semibold text-ink">Campaign Performance</h2>
        <div className="mt-4">
          <DataTable columns={tableColumns} rows={rows} testId="reports-campaign-table" />
        </div>
      </div>
    </div>
  );
}

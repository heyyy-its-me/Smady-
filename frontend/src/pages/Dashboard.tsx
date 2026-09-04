import { Download, Share2, Users, Mail, CalendarCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { ButtonOutline } from "@/components/smady/Button";
import { StatCard } from "@/components/smady/StatCard";
import { AreaChartCard, FunnelChartCard, DonutChartCard } from "@/components/smady/Charts";
import { ComparisonCard } from "@/components/smady/ComparisonCard";
import { ActivityFeed } from "@/components/smady/ActivityFeed";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { AvatarInitial, AvatarStack } from "@/components/smady/AvatarStack";
import { StatusBadge } from "@/components/smady/Badge";
import { ProgressBar } from "@/components/smady/ProgressBar";
import { KebabMenu } from "@/components/smady/KebabMenu";
import { useAppData } from "@/context/AppDataContext";
import type { Lead } from "@/types";
import { toast } from "@/components/ui/sonner";

export default function Dashboard() {
  const { dashboardStats, leads } = useAppData();
  const { leadsGrowth, emailsSentComparison, replyRateComparison, pipelineFunnel, leadSourceBreakdown, activityFeed } = dashboardStats;
  const recentLeads = leads.slice(0, 6);
  const columns: Column<Lead>[] = [
    {
      key: "lead",
      label: "Lead",
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-3">
          <AvatarInitial name={l.name} />
          <div>
            <p className="text-sm font-semibold text-ink">{l.name}</p>
            <p className="text-xs text-muted">
              {l.company} · {l.domain}
            </p>
          </div>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (l) => <StatusBadge status={l.status} /> },
    { key: "about", label: "About", render: (l) => <p className="max-w-[220px] text-sm text-body">{l.about}</p> },
    { key: "assigned", label: "Assigned", render: (l) => <AvatarStack names={l.assigned} /> },
    { key: "progress", label: "Sequence Progress", render: (l) => <ProgressBar value={l.sequenceProgress} /> },
    {
      key: "kebab",
      label: "",
      render: (l) => (
        <KebabMenu
          testId={`recent-lead-kebab-${l.id}`}
          items={[{ label: "View lead" }, { label: "Edit" }, { label: "Remove", danger: true }]}
        />
      ),
    },
  ];

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        actions={
          <>
            <ButtonOutline data-testid="dashboard-export-button" icon={<Download className="h-4 w-4" strokeWidth={1.5} />} onClick={() => toast.success("Export started")}>
              Export Data
            </ButtonOutline>
            <ButtonOutline data-testid="dashboard-share-button" onClick={() => toast.success("Link copied")}>
              <Share2 className="h-4 w-4" strokeWidth={1.5} />
            </ButtonOutline>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads Generated Today" value={dashboardStats.leadsToday.value} icon={Users} highlighted sparkline={dashboardStats.leadsToday.sparkline} trend="up" />
        <StatCard label="Total Leads" value={dashboardStats.totalLeads.value} icon={TrendingUp} sparkline={dashboardStats.totalLeads.sparkline} trend="up" />
        <StatCard label="Emails Sent" value={dashboardStats.emailsSent.value} icon={Mail} sparkline={dashboardStats.emailsSent.sparkline} trend="up" />
        <StatCard label="Meetings Booked" value={dashboardStats.meetingsBooked.value} icon={CalendarCheck} sparkline={dashboardStats.meetingsBooked.sparkline} trend="up" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <AreaChartCard
          title="Leads Growth"
          subtitle="New leads sourced over the last 12 months"
          data={leadsGrowth}
          annotation={{ label: `Total leads: ${dashboardStats.totalLeads.value}` }}
          testId="dashboard-leads-growth-chart"
        />
        <div className="space-y-5">
          <ComparisonCard
            title="Emails Sent"
            percent={emailsSentComparison.percent}
            trend={emailsSentComparison.trend}
            thisWeek={emailsSentComparison.thisWeek}
            lastWeek={emailsSentComparison.lastWeek}
            totalPerWeek={emailsSentComparison.totalPerWeek}
          />
          <ComparisonCard
            title="Reply Rate"
            percent={replyRateComparison.percent}
            trend={replyRateComparison.trend}
            thisWeek={replyRateComparison.thisWeek}
            lastWeek={replyRateComparison.lastWeek}
            totalPerWeek={replyRateComparison.totalPerWeek}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <FunnelChartCard title="Pipeline Funnel" subtitle="Leads moving through each stage" data={pipelineFunnel} testId="dashboard-pipeline-funnel" />
        <DonutChartCard title="Lead Source Breakdown" subtitle="Where your leads come from" data={leadSourceBreakdown} testId="dashboard-lead-source-donut" />
        <ActivityFeed items={activityFeed} testId="dashboard-activity-feed" />
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <div className="rounded-2xl bg-surface p-6 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">Recent Leads</h2>
          <p className="mt-1 text-xs text-muted">Leads sourced and contacted in the last 30 days.</p>
          <div className="mt-4">
            <DataTable columns={columns} rows={recentLeads} testId="dashboard-recent-leads-table" />
          </div>
        </div>
      </div>
    </div>
  );
}

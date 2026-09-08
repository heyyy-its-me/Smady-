import { Download, Share2, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { ButtonOutline } from "@/components/smady/Button";
import { StatCard } from "@/components/smady/StatCard";
import { RadialGauge } from "@/components/smady/RadialGauge";
import { CommandTower } from "@/components/smady/CommandTower";
import { AreaChartCard, FunnelChartCard, DonutChartCard } from "@/components/smady/Charts";
import { ComparisonCard } from "@/components/smady/ComparisonCard";
import { ActivityFeed } from "@/components/smady/ActivityFeed";
import { HeatmapCard } from "@/components/smady/HeatmapCard";
import { AIInsightCard } from "@/components/smady/AIInsightCard";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { AvatarInitial, AvatarStack } from "@/components/smady/AvatarStack";
import { StatusBadge } from "@/components/smady/Badge";
import { ProgressBar } from "@/components/smady/ProgressBar";
import { KebabMenu } from "@/components/smady/KebabMenu";
import { useAppData } from "@/context/AppDataContext";
import type { Lead } from "@/types";
import { toast } from "@/components/ui/sonner";
import { useState } from "react";
import { LeadDetailModal } from "@/components/smady/LeadDetailModal";
import { EditLeadModal } from "@/components/smady/EditLeadModal";

export default function Dashboard() {
  const { dashboardStats, leads, updateLead, deleteLead } = useAppData();
  const {
    leadsGrowth,
    emailsSentComparison,
    replyRateComparison,
    pipelineFunnel,
    leadSourceBreakdown,
    activityFeed,
    dailyActivity,
  } = dashboardStats;
  const recentLeads = leads.slice(0, 6);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);

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
    {
      key: "about",
      label: "About",
      render: (l) => (
        <p
          data-testid={`recent-lead-about-${l.id}`}
          title={l.about}
          className="max-w-[220px] truncate text-sm text-body"
        >
          {l.about}
        </p>
      ),
    },
    { key: "assigned", label: "Assigned", render: (l) => <AvatarStack names={l.assigned} /> },
    { key: "progress", label: "Sequence Progress", render: (l) => <ProgressBar value={l.sequenceProgress} /> },
    {
      key: "kebab",
      label: "",
      render: (l) => (
        <KebabMenu
          testId={`recent-lead-kebab-${l.id}`}
          items={[
            { label: "View lead", onClick: () => setViewLead(l) },
            { label: "Edit", onClick: () => setEditLead(l) },
            {
              label: "Remove",
              danger: true,
              onClick: () => {
                if (window.confirm(`Remove ${l.name || "this lead"}? This cannot be undone.`)) deleteLead(l.id);
              },
            },
          ]}
        />
      ),
    },
  ];

  const insight =
    dashboardStats.totalLeads.value > 0
      ? `You've sourced ${dashboardStats.totalLeads.value.toLocaleString()} leads and booked ${dashboardStats.meetingsBooked.value} meetings so far. Reply rate is trending ${replyRateComparison.trend === "up" ? "up" : "down"} ${Math.abs(replyRateComparison.percent)}% this week.`
      : "Generate your first batch of leads to unlock live AI recommendations here.";

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

      {/* ── Bento Row 1: AI Command Tower (2) + Leads Gauge (1) + Meetings Velocity (1) ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <CommandTower value={dashboardStats.leadsToday.value} sparkline={dashboardStats.leadsToday.sparkline} insight={insight} />
        <div className="flex items-center justify-center rounded-[24px] border border-border bg-surface p-6 shadow-card" data-testid="dashboard-leads-gauge-tile">
          <RadialGauge value={dashboardStats.leadsToday.value} target={Math.max(dashboardStats.leadsToday.value + 5, 20)} label="Leads Sourced Today" />
        </div>
        <StatCard label="Meetings Booked" value={dashboardStats.meetingsBooked.value} icon={CalendarCheck} sparkline={dashboardStats.meetingsBooked.sparkline} trend="up" />
      </div>

      {/* ── Bento Row 2: Activity Heatmap (2) + Pipeline Funnel (1) + Lead Source Donut (1) ── */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <HeatmapCard dailyActivity={dailyActivity ?? {}} testId="dashboard-heatmap" />
        </div>
        <FunnelChartCard title="Pipeline Funnel" subtitle="Leads by stage" data={pipelineFunnel} testId="dashboard-pipeline-funnel" />
        <DonutChartCard title="Lead Sources" subtitle="Where leads come from" data={leadSourceBreakdown} testId="dashboard-lead-source-donut" />
      </div>

      {/* ── Bento Row 3: Live Activity Feed (2) + Emails Sent (1) + Reply Rate (1) ── */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <ActivityFeed items={activityFeed} testId="dashboard-activity-feed" />
        </div>
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

      {/* ── Row 4: Leads Growth chart (8) + AI Insight (4) ── */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AreaChartCard
            title="Leads Growth"
            subtitle="New leads sourced over the last 12 months"
            data={leadsGrowth}
            annotation={{ label: `Total leads: ${dashboardStats.totalLeads.value}` }}
            testId="dashboard-leads-growth-chart"
          />
        </div>
        <div className="lg:col-span-4">
          <AIInsightCard dashboardStats={dashboardStats} testId="dashboard-ai-insight" />
        </div>
      </div>

      {/* ── Row 5: Verified Lead Database (full width) ── */}
      <div className="mt-5 rounded-[24px] border border-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-ink">Verified Lead Database</h2>
        <p className="mt-1 text-xs text-muted">Leads sourced and contacted in the last 30 days.</p>
        <div className="mt-4">
          <DataTable columns={columns} rows={recentLeads} testId="dashboard-recent-leads-table" />
        </div>
      </div>
      <LeadDetailModal lead={viewLead} open={!!viewLead} onOpenChange={(v) => !v && setViewLead(null)} />
      <EditLeadModal lead={editLead} open={!!editLead} onOpenChange={(v) => !v && setEditLead(null)} onSave={updateLead} />
    </div>
  );
}

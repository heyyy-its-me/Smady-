import { useState } from "react";
import { Plus, Mail, TrendingUp, Zap, ChevronDown, BarChart3 } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { StatCard } from "@/components/smady/StatCard";
import { MultiLineChartCard, BarChartCard } from "@/components/smady/Charts";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { StatusBadge } from "@/components/smady/Badge";
import { KebabMenu } from "@/components/smady/KebabMenu";
import { ButtonPrimary } from "@/components/smady/Button";
import { useAppData } from "@/context/AppDataContext";
import { SendCampaignCard } from "@/components/smady/SendCampaignCard";
import type { Campaign } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Outreach() {
  const { campaigns, outreachStats } = useAppData();
  const [campaignOpen, setCampaignOpen] = useState(false);

  const onSelectRun = async (id: string) => {
    // Placeholder for potential future use
  };

  const columns: Column<Campaign>[] = [
    { key: "requestId", label: "Request ID", render: (c) => <span className="text-sm font-semibold text-ink">{c.requestId}</span> },
    { key: "name", label: "Campaign Name", render: (c) => <span className="text-sm text-body">{c.name}</span> },
    { key: "leadsCount", label: "Leads Count", render: (c) => <span className="text-sm text-body">{c.leadsCount}</span> },
    { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "sentDate", label: "Sent Date", render: (c) => <span className="text-sm text-body">{c.sentDate}</span> },
    {
      key: "kebab",
      label: "",
      render: (c) => (
        <KebabMenu
          testId={`campaign-kebab-${c.id}`}
          items={[{ label: "View" }, { label: "Duplicate" }, { label: "Cancel", danger: true }]}
        />
      ),
    },
  ];

  return (
    <div data-testid="outreach-page">
      <PageHeader
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ButtonPrimary icon={<Plus className="h-4 w-4" strokeWidth={1.5} />} data-testid="outreach-new-campaign-button">
                New Campaign
                <ChevronDown className="ml-1 h-4 w-4" strokeWidth={1.5} />
              </ButtonPrimary>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setCampaignOpen(true)}>
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Create New Campaign</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Mail className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="text-muted">From Selected Leads</span>
                <span className="ml-auto text-xs text-muted">(select from Leads page)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-5">
        <StatCard 
          label="Campaigns Ran" 
          value={outreachStats.campaignsRan.value} 
          icon={Zap} 
          highlighted={outreachStats.campaignsRan.value > 0}
          sparkline={outreachStats.campaignsRan.sparkline} 
          trend="up" 
        />
        <StatCard 
          label="Emails Sent" 
          value={outreachStats.emailsSent.value} 
          icon={Mail} 
          highlighted={outreachStats.emailsSent.value > 0}
          sparkline={outreachStats.emailsSent.sparkline} 
          trend="up" 
        />
      </div>

      {/* Charts - Side by Side */}
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
                subtitle="" 
                data={outreachStats.emailsOverTime.map((d: {date: string; emails: number}) => ({
                  label: d.date,
                  emails: d.emails
                }))} 
                testId="outreach-timeline-chart"
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
                subtitle="" 
                data={outreachStats.campaignPerformance.map((c: {name: string; emails: number}) => ({
                  label: c.name,
                  value: c.emails
                }))} 
                testId="outreach-campaign-chart"
                className="!bg-transparent !shadow-none !p-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Recent Campaigns</h2>
        <div className="mt-4">
          <DataTable columns={columns} rows={campaigns} testId="outreach-requests-table" />
        </div>
      </div>

      <SendCampaignCard open={campaignOpen} onOpenChange={setCampaignOpen} />
    </div>
  );
}

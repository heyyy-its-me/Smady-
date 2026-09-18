import { useState } from "react";
import { Plus, Mail, TrendingUp, Zap, ChevronDown } from "lucide-react";
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
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

      {/* Charts */}
      <div className="mt-6 space-y-6">
        <MultiLineChartCard 
          title="Emails Sent Over Time" 
          subtitle="Last 30 days" 
          data={outreachStats.emailsOverTime.map((d: {date: string; emails: number}) => ({
            label: d.date,
            emails: d.emails
          }))} 
          testId="outreach-timeline-chart" 
        />
        
        <BarChartCard 
          title="Campaign Performance" 
          subtitle="Emails sent per campaign" 
          data={outreachStats.campaignPerformance.map((c: {name: string; emails: number}) => ({
            label: c.name,
            value: c.emails
          }))} 
          testId="outreach-campaign-chart" 
        />
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

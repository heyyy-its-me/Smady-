import { useState } from "react";
import { Plus, Mail, TrendingUp, Zap } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { StatCard } from "@/components/smady/StatCard";
import { MultiLineChartCard, BarChartCard } from "@/components/smady/Charts";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { StatusBadge } from "@/components/smady/Badge";
import { KebabMenu } from "@/components/smady/KebabMenu";
import { ButtonPrimary } from "@/components/smady/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { RunHistoryPicker } from "@/components/smady/RunHistoryPicker";
import type { Campaign } from "@/types";

export default function Outreach() {
  const { campaigns, addCampaign, outreachStats } = useAppData();
  const [open, setOpen] = useState(false);
  const [recipientSource, setRecipientSource] = useState("all");
  const [runId, setRunId] = useState<string | null>(null);
  const [runLeadCount, setRunLeadCount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {first_name}, ...");
  const [scheduled, setScheduled] = useState(false);
  const [sending, setSending] = useState(false);

  const onSelectRun = async (id: string) => {
    setRunId(id);
    const { data } = await api.get(`/leads?run_id=${id}&limit=1`);
    setRunLeadCount(data.total);
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

  const onSend = async () => {
    setSending(true);
    await addCampaign({ name: name || "Untitled Campaign", subject, body, recipientSource, runId: recipientSource === "run" ? runId ?? undefined : undefined });
    setSending(false);
    setOpen(false);
    setName("");
    setSubject("");
    setRunId(null);
    setRunLeadCount(null);
  };

  return (
    <div data-testid="outreach-page">
      <PageHeader
        actions={
          <ButtonPrimary icon={<Plus className="h-4 w-4" strokeWidth={1.5} />} onClick={() => setOpen(true)} data-testid="outreach-new-campaign-button">
            New Campaign
          </ButtonPrimary>
        }
      />

      {/* Top Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Campaigns Ran" 
          value={outreachStats.campaignsRan.value} 
          icon={Zap} 
          highlighted 
          sparkline={outreachStats.campaignsRan.sparkline} 
          trend="up" 
        />
        <StatCard 
          label="Emails Sent" 
          value={outreachStats.emailsSent.value} 
          icon={Mail} 
          highlighted 
          sparkline={outreachStats.emailsSent.sparkline} 
          trend="up" 
        />
        <StatCard 
          label="Email Conversion" 
          value={outreachStats.emailsSent.value > 0 ? Math.round((outreachStats.emailsSent.value * 3.2) / 100) : 0}
          icon={TrendingUp}
          sparkline={outreachStats.emailsSent.sparkline}
          trend="up"
        />
        <StatCard 
          label="Avg per Campaign" 
          value={outreachStats.campaignsRan.value > 0 ? Math.round(outreachStats.emailsSent.value / outreachStats.campaignsRan.value) : 0}
          icon={Mail}
          sparkline={[0, 0, 0, 0, 0, 0, 0]}
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

      {/* New Campaign Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="new-campaign-modal">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Campaign Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 SaaS VP Outreach" data-testid="campaign-name-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Recipient Source</label>
              <select
                value={recipientSource}
                onChange={(e) => {
                  setRecipientSource(e.target.value);
                  if (e.target.value !== "run") {
                    setRunId(null);
                    setRunLeadCount(null);
                  }
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-ink"
                data-testid="campaign-recipient-source-select"
              >
                <option value="all">All leads (every execution, ever)</option>
                <option value="run">From a specific execution</option>
              </select>
            </div>
            {recipientSource === "run" && (
              <div className="space-y-2 rounded-xl border border-primary-100/70 bg-primary-50/40 p-3.5" data-testid="campaign-run-picker-wrapper">
                <p className="text-xs text-muted">Pick which lead-generation run to target — even ones from days ago.</p>
                <RunHistoryPicker selectedRunId={runId} onSelect={onSelectRun} />
                {runId && (
                  <p className="text-sm font-semibold text-primary-700" data-testid="campaign-run-lead-count">
                    {runLeadCount === null ? "Loading..." : `${runLeadCount} lead(s) will be contacted from this run`}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Subject Line</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Quick question about {company}" data-testid="campaign-subject-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Body</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} data-testid="campaign-body-textarea" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <span className="text-sm text-body">{scheduled ? "Schedule for later" : "Send Now"}</span>
              <Switch checked={scheduled} onCheckedChange={setScheduled} data-testid="campaign-schedule-toggle" />
            </div>
            <ButtonPrimary
              fullWidth
              loading={sending}
              disabled={recipientSource === "run" && !runId}
              onClick={onSend}
              data-testid="campaign-send-button"
            >
              Send Campaign
            </ButtonPrimary>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

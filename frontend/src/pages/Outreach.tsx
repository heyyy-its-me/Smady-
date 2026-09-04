import { useState } from "react";
import { Plus, Mail, MousePointerClick, MessageSquareReply, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { StatCard } from "@/components/smady/StatCard";
import { BarChartCard } from "@/components/smady/Charts";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { StatusBadge } from "@/components/smady/Badge";
import { KebabMenu } from "@/components/smady/KebabMenu";
import { ButtonPrimary } from "@/components/smady/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { weeklyEmailsSent, outreachStats } from "@/mock/outreach";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";
import type { Campaign } from "@/types";

export default function Outreach() {
  const { campaigns, addCampaign } = useAppData();
  const [open, setOpen] = useState(false);
  const [recipientSource, setRecipientSource] = useState("all");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {first_name}, ...");
  const [scheduled, setScheduled] = useState(false);
  const [sending, setSending] = useState(false);

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
    await new Promise((r) => setTimeout(r, 1200));
    addCampaign({ name: name || "Untitled Campaign", leadsCount: Math.floor(Math.random() * 200) + 50, subject, body });
    setSending(false);
    setOpen(false);
    setName("");
    setSubject("");
    toast.success(scheduled ? "Campaign scheduled" : "Campaign sent");
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Emails Sent" value={outreachStats.emailsSent.value} icon={Mail} highlighted sparkline={outreachStats.emailsSent.sparkline} trend="up" />
        <StatCard label="Open Rate" value={outreachStats.openRate.value} suffix="%" icon={MousePointerClick} sparkline={outreachStats.openRate.sparkline} trend="up" />
        <StatCard label="Reply Rate" value={outreachStats.replyRate.value} suffix="%" icon={MessageSquareReply} sparkline={outreachStats.replyRate.sparkline} trend="up" />
        <StatCard label="Bounce Rate" value={outreachStats.bounceRate.value} suffix="%" icon={AlertTriangle} sparkline={outreachStats.bounceRate.sparkline} trend="down" />
      </div>

      <div className="mt-6">
        <BarChartCard title="Emails Sent This Week" subtitle="Monday through Sunday" data={weeklyEmailsSent} testId="outreach-weekly-chart" />
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Recent Requests</h2>
        <div className="mt-4">
          <DataTable columns={columns} rows={campaigns} testId="outreach-requests-table" />
        </div>
      </div>

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
                onChange={(e) => setRecipientSource(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-ink"
                data-testid="campaign-recipient-source-select"
              >
                <option value="all">All leads</option>
                <option value="select">Select from Leads table</option>
              </select>
            </div>
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
            <ButtonPrimary fullWidth loading={sending} onClick={onSend} data-testid="campaign-send-button">
              Send Campaign
            </ButtonPrimary>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

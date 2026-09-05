import { useState } from "react";
import { Send, Clock, CheckCircle2, Eye, Check, X } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { FormCard } from "@/components/smady/FormCard";
import { StatCard } from "@/components/smady/StatCard";
import { StatusBadge } from "@/components/smady/Badge";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";

const templates = ["Standard Growth Package", "Enterprise Rollout", "Starter Plan"];

export default function Proposals() {
  const { proposals, generatingProposal, generateProposal, approveProposal, rejectProposal } = useAppData();
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [template, setTemplate] = useState(templates[0]);
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const autoSent = proposals.filter((p) => p.final_status === "Approved").length;
  const pendingReview = proposals.filter((p) => p.final_status === "Needs Review").length;
  const approvalRate = proposals.length ? Math.round(((proposals.length - pendingReview) / proposals.length) * 100) : 0;

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) {
      toast.error("Enter the lead's name and email first");
      return;
    }
    await generateProposal({ lead_name: leadName, lead_email: leadEmail, proposal_template: template, key_points: notes });
  };

  return (
    <div data-testid="proposals-page">
      <PageHeader />

      <FormCard title="Generate a Proposal" testId="proposal-form-card">
        <form onSubmit={onGenerate} className="grid grid-cols-1 gap-5 sm:grid-cols-2" data-testid="proposal-generate-form">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Lead Name</label>
            <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Jordan Blake" data-testid="proposal-lead-name-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Lead Email</label>
            <Input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="jordan@company.com" data-testid="proposal-lead-email-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Proposal Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-ink"
              data-testid="proposal-template-select"
            >
              {templates.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Key Points / Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything specific to include..." data-testid="proposal-notes-textarea" />
          </div>
          <div className="sm:col-span-2">
            <ButtonPrimary type="submit" fullWidth loading={generatingProposal} data-testid="proposal-generate-button">
              {generatingProposal ? "Drafting proposal…" : "Generate Proposal"}
            </ButtonPrimary>
          </div>
        </form>
      </FormCard>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Auto-Sent Proposals" value={autoSent} icon={Send} />
        <StatCard label="Pending Review" value={pendingReview} icon={Clock} />
        <StatCard label="Approval Rate" value={approvalRate} suffix="%" icon={CheckCircle2} />
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Pending Manual Review</h2>
        <div className="mt-4 space-y-3">
          {proposals.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-4" data-testid={`proposal-card-${p.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AvatarInitial name={p.lead_name} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.lead_name}</p>
                    <p className="text-xs text-muted">
                      {p.lead_email} · {new Date(p.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.final_status} />
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-muted hover:text-ink" data-testid={`proposal-preview-toggle-${p.id}`}>
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              {expanded === p.id && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-3 text-xs text-body" data-testid={`proposal-content-${p.id}`}>
                  {JSON.stringify(p.proposal_json, null, 2) || "No proposal content yet."}
                </pre>
              )}
              {p.final_status === "Needs Review" && (
                <div className="mt-3 flex gap-2">
                  <ButtonPrimary icon={<Check className="h-4 w-4" strokeWidth={1.5} />} className="px-4 py-2 text-xs" onClick={() => { approveProposal(p.id); toast.success("Proposal approved"); }} data-testid={`proposal-approve-${p.id}`}>
                    Approve
                  </ButtonPrimary>
                  <ButtonOutline
                    icon={<X className="h-4 w-4 text-danger" strokeWidth={1.5} />}
                    className="px-4 py-2 text-xs text-danger"
                    onClick={() => { rejectProposal(p.id); toast.success("Proposal rejected"); }}
                    data-testid={`proposal-reject-${p.id}`}
                  >
                    Reject
                  </ButtonOutline>
                </div>
              )}
            </div>
          ))}
          {proposals.length === 0 && <p className="text-sm text-muted">No proposals yet.</p>}
        </div>
      </div>
    </div>
  );
}

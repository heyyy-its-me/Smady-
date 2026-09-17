import { useState, useEffect } from "react";
import { Send, Clock, CheckCircle2, Eye, Check, X, AlertTriangle, Search, RefreshCw, ChevronDown, ChevronUp, Package, Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { FormCard } from "@/components/smady/FormCard";
import { StatCard } from "@/components/smady/StatCard";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";
import type { Proposal, PricingPackage } from "@/types";

// ── status helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  "needs_review": "bg-amber-50 text-amber-700 border border-amber-200",
  "Needs Review": "bg-amber-50 text-amber-700 border border-amber-200",
  "sent": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Sent": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Approved": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "sent_after_revision": "bg-sky-50 text-sky-700 border border-sky-200",
  "Rejected": "bg-red-50 text-red-700 border border-red-200",
  "webhook_not_configured": "bg-gray-50 text-gray-500 border border-gray-200",
  "pending": "bg-gray-50 text-gray-500 border border-gray-200",
  "submitted": "bg-sky-50 text-sky-600 border border-sky-200",
};

const STATUS_LABELS: Record<string, string> = {
  "needs_review": "Needs Review",
  "Needs Review": "Needs Review",
  "sent": "Sent",
  "sent_after_revision": "Sent (Revised)",
  "pending": "Pending",
  "submitted": "Submitted to n8n",
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || "bg-gray-50 text-gray-500 border border-gray-200";
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({ proposal, onClose, onReject }: {
  proposal: Proposal;
  onClose: () => void;
  onReject: (id: string | number, feedback: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isValid = feedback.trim().length >= 10;

  const onSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onReject(proposal.id, feedback.trim());
      onClose();
    } catch (_e) {
      // error toast shown by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="reject-proposal-modal">
        <DialogHeader>
          <DialogTitle>Reject &amp; Request Revision</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted">
          Tell us what to change. n8n will regenerate the proposal based on your feedback.
          <span className="ml-1 font-semibold text-red-500">(Minimum 10 characters)</span>
        </p>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder="e.g. Price is too high for this lead's budget. Mention their existing tool integration challenges. Lead with the pain point about manual workflows."
          className="mt-3"
          data-testid="reject-feedback-textarea"
        />
        <p className={`mt-1 text-xs ${feedback.trim().length >= 10 ? "text-emerald-600" : "text-muted"}`}>
          {feedback.trim().length} / 10 characters minimum
        </p>
        <div className="mt-4 flex gap-2">
          <ButtonPrimary
            fullWidth
            loading={submitting}
            disabled={!isValid}
            onClick={onSubmit}
            data-testid="reject-feedback-submit"
          >
            Submit &amp; Regenerate
          </ButtonPrimary>
          <ButtonOutline onClick={onClose}>Cancel</ButtonOutline>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Proposal card ──────────────────────────────────────────────────────────────

function ProposalCard({ p, onApprove, onReject }: {
  p: Proposal;
  onApprove: (id: string | number) => void;
  onReject: (p: Proposal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isNeedsReview = p.final_status === "needs_review" || p.final_status === "Needs Review";
  const guardrailErrors = Array.isArray(p.guardrail_errors) ? p.guardrail_errors : [];
  const reviewerIssues = Array.isArray(p.reviewer_issues) ? p.reviewer_issues : [];

  const displayEmail = p.lead_email || p.lead_name || "Unknown lead";
  const displayDate = p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${isNeedsReview ? "border-amber-200 bg-amber-50/20" : "border-border"}`}
      data-testid={`proposal-card-${p.id}`}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {displayEmail.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{displayEmail}</p>
            <p className="text-xs text-muted">{displayDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {p.is_revision && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 border border-red-200">
              2nd Cycle
            </span>
          )}
          <StatusPill status={p.final_status} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-ink"
            data-testid={`proposal-expand-${p.id}`}
          >
            {expanded ? <ChevronUp className="h-4 w-4" strokeWidth={1.5} /> : <ChevronDown className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Package summary row */}
      {(p.package_selected || p.quoted_price) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
          {p.package_selected && (
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Package className="h-3.5 w-3.5 text-primary-500" strokeWidth={1.5} />
              {p.package_selected}
            </span>
          )}
          {p.quoted_price != null && (
            <span className="font-bold text-primary-600">${p.quoted_price}</span>
          )}
          {p.valid_until && (
            <span className="text-muted">valid until {p.valid_until}</span>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-4" data-testid={`proposal-detail-${p.id}`}>
          {/* Guardrail errors — distinct section */}
          {guardrailErrors.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-red-600">
                ⚠ Guardrail Errors ({guardrailErrors.length})
              </p>
              <ul className="space-y-1.5">
                {guardrailErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" strokeWidth={2} />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reviewer issues — distinct section (different system, different meaning) */}
          {reviewerIssues.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                🔍 AI Reviewer Issues ({reviewerIssues.length})
              </p>
              <ul className="space-y-1.5">
                {reviewerIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Search className="mt-0.5 h-3 w-3 flex-shrink-0" strokeWidth={2} />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Proposal body */}
          {p.body_html ? (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Proposal Draft</p>
              <div
                className="rounded-lg border border-border bg-bg p-4 text-sm text-body leading-relaxed"
                dangerouslySetInnerHTML={{ __html: p.body_html }}
              />
            </div>
          ) : p.proposal_json && Object.keys(p.proposal_json).length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Proposal Data</p>
              <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs text-body">
                {JSON.stringify(p.proposal_json, null, 2)}
              </pre>
            </div>
          ) : null}

          {/* Context JSON (lead requirements from call) */}
          {p.context_json && (
            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted hover:text-ink">
                Lead Requirements (from call context)
              </summary>
              <div className="px-3 pb-3 pt-1">
                {(() => {
                  const ctx = p.context_json as Record<string, unknown>;
                  const req = (ctx?.requirements || ctx) as Record<string, unknown>;
                  if (!req) return null;
                  const fields = [
                    ["Budget Signal", req?.budget_signal],
                    ["Timeline", req?.timeline],
                    ["Key Requirements", Array.isArray(req?.key_requirements) ? (req.key_requirements as string[]).join(", ") : null],
                    ["Pain Points", Array.isArray(req?.pain_points) ? (req.pain_points as string[]).join(", ") : null],
                    ["Objections Raised", Array.isArray(req?.objections_raised) ? (req.objections_raised as string[]).join(", ") : null],
                  ].filter(([, v]) => v) as [string, string][];
                  return fields.length > 0 ? (
                    <dl className="space-y-2">
                      {fields.map(([label, val]) => (
                        <div key={label}>
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
                          <dd className="mt-0.5 text-xs text-body">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <pre className="text-xs text-muted">{JSON.stringify(p.context_json, null, 2)?.slice(0, 400)}</pre>
                  );
                })()}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Approve / Reject buttons — only for needs_review proposals */}
      {isNeedsReview && (
        <div className="mt-3 flex gap-2">
          <ButtonPrimary
            icon={<Check className="h-4 w-4" strokeWidth={1.5} />}
            className="px-4 py-2 text-xs"
            onClick={() => onApprove(p.id)}
            data-testid={`proposal-approve-${p.id}`}
          >
            Approve &amp; Send
          </ButtonPrimary>
          <ButtonOutline
            icon={<X className="h-4 w-4 text-danger" strokeWidth={1.5} />}
            className="px-4 py-2 text-xs text-danger"
            onClick={() => onReject(p)}
            data-testid={`proposal-reject-${p.id}`}
          >
            Reject &amp; Revise
          </ButtonOutline>
        </div>
      )}
    </div>
  );
}

// ── Pricing Plans Manager ───────────────────────────────────────────────────────

interface PlanFormState {
  package_name: string;
  floor_price: string;
  ceiling_price: string;
  includes: string;
  valid_days: string;
}

const emptyPlanForm: PlanFormState = { package_name: "", floor_price: "", ceiling_price: "", includes: "", valid_days: "30" };

function PricingPlansManager() {
  const { pricingPackages, createPricingPackage, updatePricingPackage, deletePricingPackage } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm);
  const [saving, setSaving] = useState(false);

  const ownPlans = pricingPackages.filter((p) => p.is_own);
  const globalPlans = pricingPackages.filter((p) => !p.is_own);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyPlanForm);
    setShowForm(true);
  };

  const startEdit = (p: PricingPackage) => {
    setEditingId(p.id);
    setForm({
      package_name: p.package_name,
      floor_price: String(p.floor_price),
      ceiling_price: String(p.ceiling_price),
      includes: p.includes || "",
      valid_days: String(p.valid_days ?? 30),
    });
    setShowForm(true);
  };

  const onSave = async () => {
    if (!form.package_name.trim() || !form.floor_price || !form.ceiling_price) {
      toast.error("Plan name, floor price, and ceiling price are required");
      return;
    }
    const floor = Number(form.floor_price);
    const ceiling = Number(form.ceiling_price);
    if (ceiling < floor) {
      toast.error("Ceiling price must be greater than or equal to floor price");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        package_name: form.package_name.trim(),
        floor_price: floor,
        ceiling_price: ceiling,
        includes: form.includes.trim(),
        valid_days: Number(form.valid_days) || 30,
      };
      if (editingId) {
        await updatePricingPackage(editingId, payload);
      } else {
        await createPricingPackage(payload);
      }
      setShowForm(false);
      setForm(emptyPlanForm);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this pricing plan? This can't be undone.")) return;
    await deletePricingPackage(id);
  };

  return (
    <div className="mt-5 rounded-2xl bg-surface p-6 shadow-card" data-testid="pricing-plans-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-ink">Your Pricing Plans</h3>
          <p className="text-xs text-muted">Proposals sent for your leads are quoted only from these plans.</p>
        </div>
        <ButtonPrimary
          icon={<Plus className="h-4 w-4" strokeWidth={1.5} />}
          className="px-3 py-2 text-xs"
          onClick={startCreate}
          data-testid="pricing-plan-add-button"
        >
          Add Plan
        </ButtonPrimary>
      </div>

      {ownPlans.length === 0 && globalPlans.length === 0 && (
        <p className="mt-4 text-sm text-muted">No pricing plans yet. Add one so proposals know what to quote your leads.</p>
      )}

      {ownPlans.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ownPlans.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-border bg-bg p-4" data-testid={`pricing-plan-${pkg.id}`}>
              <div className="flex items-start justify-between">
                <p className="text-sm font-bold text-ink">{pkg.package_name}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(pkg)}
                    className="rounded-md p-1 text-muted hover:bg-surface hover:text-ink"
                    data-testid={`pricing-plan-edit-${pkg.id}`}
                    aria-label="Edit plan"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => onDelete(pkg.id)}
                    className="rounded-md p-1 text-muted hover:bg-surface hover:text-danger"
                    data-testid={`pricing-plan-delete-${pkg.id}`}
                    aria-label="Delete plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm font-semibold text-primary-600">${pkg.floor_price}–${pkg.ceiling_price}</p>
              {pkg.includes && <p className="mt-1 text-xs text-muted">{pkg.includes}</p>}
              <p className="mt-1 text-[11px] text-muted">Valid {pkg.valid_days} days</p>
            </div>
          ))}
        </div>
      )}

      {globalPlans.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Shared / Default Plans</p>
          <div className="flex flex-wrap gap-2">
            {globalPlans.map((pkg) => (
              <div key={pkg.id} className="rounded-xl border border-border bg-bg px-4 py-2.5" data-testid={`pricing-plan-global-${pkg.id}`}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600">{pkg.package_name}</p>
                <p className="text-sm font-semibold text-ink">${pkg.floor_price}–${pkg.ceiling_price}</p>
                <p className="text-xs text-muted">{pkg.valid_days} day validity</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Pricing Plan" : "Add Pricing Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Plan Name</label>
              <Input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} placeholder="Growth Package" data-testid="pricing-plan-name-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Floor Price ($)</label>
              <Input type="number" value={form.floor_price} onChange={(e) => setForm({ ...form, floor_price: e.target.value })} placeholder="2000" data-testid="pricing-plan-floor-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Ceiling Price ($)</label>
              <Input type="number" value={form.ceiling_price} onChange={(e) => setForm({ ...form, ceiling_price: e.target.value })} placeholder="6000" data-testid="pricing-plan-ceiling-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Valid For (days)</label>
              <Input type="number" value={form.valid_days} onChange={(e) => setForm({ ...form, valid_days: e.target.value })} placeholder="30" data-testid="pricing-plan-days-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">What's Included</label>
              <Textarea value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} placeholder="Comma-separated features/deliverables" data-testid="pricing-plan-includes-input" />
            </div>
            <div className="sm:col-span-2">
              <ButtonPrimary fullWidth loading={saving} onClick={onSave} data-testid="pricing-plan-save-button">
                {editingId ? "Save Changes" : "Create Plan"}
              </ButtonPrimary>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const fallbackTemplates = ["Standard Growth Package", "Enterprise Rollout", "Starter Plan"];

export default function Proposals() {
  const { proposals, reviewQueue, pricingPackages, generatingProposal, generateProposal, approveProposal, rejectProposal, refreshMeetings } = useAppData();
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [validDays, setValidDays] = useState("30");
  const planOptions = pricingPackages.length > 0 ? pricingPackages.map((p) => p.package_name) : fallbackTemplates;
  const [template, setTemplate] = useState(planOptions[0]);
  const [notes, setNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Proposal | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");

  useEffect(() => {
    if (!planOptions.includes(template)) setTemplate(planOptions[0]);
  }, [planOptions.join("|")]);

  // Recalc stats from both sources
  const allProposals = proposals;
  const autoSent = allProposals.filter((p) => ["sent", "Sent", "Approved", "sent_after_revision"].includes(p.final_status)).length;
  const pendingReview = allProposals.filter((p) => ["needs_review", "Needs Review"].includes(p.final_status)).length;
  const approvalRate = allProposals.length
    ? Math.round((autoSent / allProposals.length) * 100)
    : 0;

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) {
      toast.error("Enter the lead's name and email first");
      return;
    }
    if (!subject.trim() || !body.trim() || !quotedPrice) {
      toast.error("Subject, proposal body, and quoted price are required");
      return;
    }
    await generateProposal({
      lead_name: leadName,
      lead_email: leadEmail,
      proposal_template: template,
      proposal_subject: subject.trim(),
      proposal_body: body.trim(),
      quoted_price: Number(quotedPrice),
      valid_days: Number(validDays) || 30,
      key_points: notes,
    });
    setSubject("");
    setBody("");
    setQuotedPrice("");
    setNotes("");
  };

  const onApprove = async (id: string | number) => {
    await approveProposal(id);
  };

  const onReject = (p: Proposal) => {
    setRejectTarget(p);
  };

  const handleRejectSubmit = async (id: string | number, feedback: string) => {
    await rejectProposal(id, feedback);
  };

  // Queue = needs_review only; History = everything else
  const queueItems = allProposals.filter((p) => ["needs_review", "Needs Review"].includes(p.final_status));
  const historyItems = allProposals.filter((p) => !["needs_review", "Needs Review", "pending", "webhook_not_configured", "submitted"].includes(p.final_status));

  return (
    <div data-testid="proposals-page">
      <PageHeader />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Sent / Approved" value={autoSent} icon={Send} />
        <StatCard label="Pending Review" value={pendingReview} icon={Clock} />
        <StatCard label="Approval Rate" value={approvalRate} suffix="%" icon={CheckCircle2} />
      </div>

      {/* Generate form */}
      <FormCard title="Generate a Proposal" testId="proposal-form-card" className="mt-5">
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
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Pricing Plan to Quote</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-ink"
              data-testid="proposal-template-select"
            >
              {planOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {pricingPackages.length === 0 && (
              <p className="mt-1 text-xs text-muted">No pricing plans yet — add one below so this quotes a real plan.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Proposal Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your Growth Partnership Proposal" data-testid="proposal-subject-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Quoted Price ($)</label>
            <Input type="number" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} placeholder="4500" data-testid="proposal-price-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Valid For (days)</label>
            <Input type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} placeholder="30" data-testid="proposal-valid-days-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Proposal Body</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste your proposal text (plain text or HTML)..." className="min-h-[120px]" data-testid="proposal-body-textarea" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Key Points / Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything specific to include..." data-testid="proposal-notes-textarea" />
          </div>
          <div className="sm:col-span-2">
            <ButtonPrimary type="submit" fullWidth loading={generatingProposal} data-testid="proposal-generate-button">
              {generatingProposal ? "Drafting proposal…" : "Generate Proposal"}
            </ButtonPrimary>
          </div>
        </form>
      </FormCard>

      <PricingPlansManager />

      {/* Review queue + history tabs */}
      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-xl bg-bg p-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === "queue" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              data-testid="proposals-tab-queue"
            >
              Review Queue
              {pendingReview > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingReview}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === "history" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              data-testid="proposals-tab-history"
            >
              History
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {activeTab === "queue" && (
            <>
              {queueItems.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center" data-testid="proposals-empty-state">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-ink">All caught up!</p>
                  <p className="mt-1 text-xs text-muted">No proposals awaiting manual review.</p>
                </div>
              ) : (
                queueItems.map((p) => (
                  <ProposalCard key={p.id} p={p} onApprove={onApprove} onReject={onReject} />
                ))
              )}
            </>
          )}

          {activeTab === "history" && (
            <>
              {historyItems.length === 0 ? (
                <div className="py-8 text-center" data-testid="proposals-history-empty">
                  <p className="text-sm text-muted">No proposal history yet.</p>
                </div>
              ) : (
                historyItems.map((p) => (
                  <ProposalCard key={p.id} p={p} onApprove={onApprove} onReject={onReject} />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          proposal={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onReject={handleRejectSubmit}
        />
      )}
    </div>
  );
}

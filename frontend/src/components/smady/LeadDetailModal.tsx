import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/smady/Badge";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { Sparkles, Building2, MapPin, Phone, Linkedin, TrendingUp, Target, Lightbulb } from "lucide-react";
import type { Lead } from "@/types";

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="min-w-0" data-testid={`lead-detail-row-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-ink">{value}</p>
    </div>
  );
}

export function LeadDetailModal({ lead, open, onOpenChange }: { lead: Lead | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!lead) return null;
  const priorityColor =
    lead.priority === "High" ? "bg-danger/10 text-danger" : lead.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-muted/15 text-body";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto" data-testid="lead-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <AvatarInitial name={lead.name} />
            <span>
              <span className="block text-base font-semibold text-ink">{lead.name || "Unnamed Lead"}</span>
              <span className="block text-xs font-normal text-muted">{lead.title}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <StatusBadge status={lead.status} />
          <StatusBadge status={lead.source} />
          {typeof lead.leadScore === "number" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600" data-testid="lead-detail-score">
              <TrendingUp className="h-3 w-3" strokeWidth={2} /> Score: {lead.leadScore}
            </span>
          )}
          {lead.priority && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColor}`} data-testid="lead-detail-priority">
              {lead.priority} Priority
            </span>
          )}
          {lead.icpMatch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success" data-testid="lead-detail-icp-match">
              <Target className="h-3 w-3" strokeWidth={2} /> ICP: {lead.icpMatch}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-border py-4">
          <DetailRow label="Email" value={lead.email} />
          <DetailRow label="Phone" value={lead.phone} />
          <DetailRow label="Seniority" value={lead.seniority} />
          <DetailRow label="Location" value={lead.location} />
        </div>

        <div className="space-y-1 border-b border-border py-4">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-700">
            <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Company
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <DetailRow label="Company" value={lead.company} />
            <DetailRow label="Website" value={lead.domain} />
            <DetailRow label="Industry" value={lead.industry} />
            <DetailRow label="Employees" value={lead.employees} />
            <DetailRow label="Founded" value={lead.foundedYear} />
            <DetailRow label="Funding Stage" value={lead.fundingStage} />
            <DetailRow label="Annual Revenue" value={lead.annualRevenue} />
            <DetailRow label="Technologies" value={lead.technologies} />
          </div>
          <DetailRow label="About" value={lead.companyDescription || lead.about} />
        </div>

        {(lead.personalizationHook || lead.painPointsMatched || lead.recommendedAction) && (
          <div className="space-y-3 pt-4">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-700">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> AI Intelligence
            </p>
            <DetailRow label="Pain Points Matched" value={lead.painPointsMatched} />
            <div className="rounded-xl border border-primary-100/70 bg-primary-50/50 p-3.5" data-testid="lead-detail-personalization-hook">
              {lead.personalizationHook && (
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" strokeWidth={1.5} />
                  <p className="text-sm text-ink">{lead.personalizationHook}</p>
                </div>
              )}
            </div>
            <DetailRow label="Recommended Action" value={lead.recommendedAction} />
          </div>
        )}

        {lead.linkedin && (
          <a
            href={lead.linkedin.startsWith("http") ? lead.linkedin : `https://${lead.linkedin}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
            data-testid="lead-detail-linkedin-link"
          >
            <Linkedin className="h-4 w-4" strokeWidth={1.5} /> View LinkedIn Profile
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

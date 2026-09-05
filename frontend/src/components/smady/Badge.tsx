import { cn, slug } from "@/lib/utils";

export function EyebrowBadge({ text }: { text: string }) {
  return (
    <span
      data-testid={`eyebrow-badge-${slug(text)}`}
      className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
      {text}
    </span>
  );
}

export function PlanBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600" data-testid="plan-badge">
      {text}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  New: "bg-muted/15 text-body",
  Verified: "bg-muted/15 text-body",
  Contacted: "bg-[#FDE68A]/40 text-amber-700",
  Interested: "bg-primary-50 text-primary-600",
  "Meeting Booked": "bg-success/10 text-success",
  Churned: "bg-danger/10 text-danger",
  Queued: "bg-muted/15 text-body",
  Sending: "bg-primary-50 text-primary-600",
  Sent: "bg-success/10 text-success",
  Failed: "bg-danger/10 text-danger",
  Confirmed: "bg-success/10 text-success",
  "Pending Reply": "bg-[#FDE68A]/40 text-amber-700",
  "Auto-Booked": "bg-primary-50 text-primary-600",
  "Needs Review": "bg-[#FDE68A]/40 text-amber-700",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-danger/10 text-danger",
  webhook_not_configured: "bg-muted/15 text-body",
  Agent: "bg-primary-50 text-primary-600",
  Uploaded: "bg-muted/15 text-body",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-muted/15 text-body";
  return (
    <span data-testid={`status-badge-${slug(status)}`} className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", style)}>
      {status}
    </span>
  );
}

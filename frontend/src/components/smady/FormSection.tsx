import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormSection({ label, children, tint = false, className }: { label: string; children: ReactNode; tint?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-xl p-1", tint && "bg-primary-50/40 p-5", className)} data-testid={`form-section-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-4 flex items-center gap-3">
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-primary-600">{label}</p>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

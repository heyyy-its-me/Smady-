import React from "react";
import { cn } from "@/lib/utils";

export function FormCard({ title, subtitle, children, className, testId }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cn("rounded-2xl bg-surface p-4 shadow-card md:p-6", className)} data-testid={testId}>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-body">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

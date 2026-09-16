import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FormSection({
  label,
  children,
  tint = false,
  step,
  icon: Icon,
  className,
}: {
  label: string;
  children: ReactNode;
  tint?: boolean;
  step?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 shadow-soft transition-shadow duration-200 hover:shadow-card sm:p-6",
        tint
          ? "border-primary-200/70 bg-gradient-to-br from-primary-50/80 via-white to-orange-50/40"
          : "border-primary-100/60 bg-gradient-to-br from-amber-50/40 via-white to-primary-50/20",
        className,
      )}
      data-testid={`form-section-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary-200/25 blur-2xl transition-transform duration-500 group-hover:scale-125"
        aria-hidden
      />
      <div className="relative mb-5 flex items-center gap-3">
        {step && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent text-xs font-extrabold text-white shadow-md shadow-primary-500/30">
            {step}
          </span>
        )}
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary-600 shadow-soft">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        <p className="font-display text-xs font-extrabold uppercase tracking-wider text-primary-700">{label}</p>
        <div className="h-px flex-1 bg-primary-200/40" />
      </div>
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </motion.div>
  );
}

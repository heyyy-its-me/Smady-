import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn, slug } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import { useCountUp } from "@/hooks/useCountUp";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  highlighted?: boolean;
  sparkline?: number[];
  trend?: "up" | "down";
  prefix?: string;
  suffix?: string;
}

export function StatCard({ label, value, icon: Icon, highlighted, sparkline, trend = "up", prefix = "", suffix = "" }: StatCardProps) {
  const count = useCountUp(value, 800);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid={`stat-card-${slug(label)}`}
      className={cn(
        "group rounded-2xl p-7 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-nav",
        highlighted ? "bg-gradient-to-br from-primary-400 to-primary-600 text-white" : "bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition-transform duration-200 group-hover:scale-110",
            highlighted ? "bg-white/20 shadow-none" : "bg-gradient-to-br from-primary-500 to-accent shadow-primary-500/25",
          )}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
        <button
          className={cn("flex h-8 w-8 items-center justify-center rounded-full border transition-colors", highlighted ? "border-white/40 text-white hover:bg-white/10" : "border-border text-ink hover:bg-bg")}
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <p className={cn("mt-6 text-[11px] font-semibold uppercase tracking-wide", highlighted ? "text-white/70" : "text-muted")}>{label}</p>
      <div className="mt-1.5 flex items-end justify-between">
        <p className="tabular-nums text-4xl font-bold">
          {prefix}
          {count.toLocaleString()}
          {suffix}
        </p>
        {sparkline && <Sparkline data={sparkline} positive={trend === "up"} />}
      </div>
    </motion.div>
  );
}

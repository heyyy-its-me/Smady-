import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { useCountUp } from "@/hooks/useCountUp";

interface CommandTowerProps {
  value: number;
  sparkline: number[];
  insight: string;
}

export function CommandTower({ value, sparkline, insight }: CommandTowerProps) {
  const count = useCountUp(value, 900);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative col-span-1 overflow-hidden rounded-[24px] border border-black/60 bg-[#171412] p-7 text-white shadow-card md:col-span-2"
      data-testid="dashboard-command-tower"
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-500/25 blur-[90px]" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#FFC94A]/15 blur-[90px]" />
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
            <Sparkles className="h-3 w-3" strokeWidth={2} /> AI Copilot
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/40">Leads Generated Today</p>
          <p className="mt-1 font-display text-6xl font-bold tabular-nums">{count.toLocaleString()}</p>
        </div>
        <Sparkline data={sparkline} positive />
      </div>
      <div className="relative z-[1] mt-6 rounded-2xl bg-white/5 p-4">
        <p className="text-sm leading-relaxed text-white/80">{insight}</p>
      </div>
      <Link
        to="/leads"
        className="relative z-[1] mt-5 inline-flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        data-testid="dashboard-launch-campaign-button"
      >
        Launch Next Campaign <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </motion.div>
  );
}

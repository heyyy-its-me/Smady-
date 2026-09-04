import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn, slug } from "@/lib/utils";

interface ComparisonCardProps {
  title: string;
  percent: number;
  trend: "up" | "down";
  thisWeek: number[];
  lastWeek: number[];
  totalPerWeek: number;
}

export function ComparisonCard({ title, percent, trend, thisWeek, lastWeek, totalPerWeek }: ComparisonCardProps) {
  const maxVal = Math.max(...thisWeek, ...lastWeek);
  return (
    <div className="rounded-2xl bg-surface p-6 shadow-card transition-shadow hover:shadow-nav" data-testid={`comparison-card-${slug(title)}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="text-xs text-muted">vs last week</p>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink hover:bg-bg">
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {trend === "up" ? <TrendingUp className="h-5 w-5 text-success" strokeWidth={1.5} /> : <TrendingDown className="h-5 w-5 text-danger" strokeWidth={1.5} />}
        <span className={cn("text-3xl font-bold tabular-nums", trend === "up" ? "text-success" : "text-danger")}>
          {percent > 0 ? "+" : ""}
          {percent}%
        </span>
      </div>
      <div className="mt-5 flex items-end gap-6 rounded-xl bg-bg/60 p-4">
        <div>
          <div className="flex h-16 items-end gap-1.5">
            {thisWeek.map((v, i) => (
              <div
                key={i}
                style={{
                  height: `${Math.max((v / maxVal) * 100, 10)}%`,
                  backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.4) 0 3px, transparent 3px 6px)",
                  backgroundColor: "#F9622C",
                }}
                className="w-2.5 rounded-t-md"
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] font-medium text-muted">This Week</p>
        </div>
        <div>
          <div className="flex h-16 items-end gap-1.5">
            {lastWeek.map((v, i) => (
              <div
                key={i}
                style={{
                  height: `${Math.max((v / maxVal) * 100, 10)}%`,
                  background: trend === "up" ? "#22C55E" : "linear-gradient(to top, #FDE68A, #BEF264)",
                }}
                className="w-2.5 rounded-t-md"
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] font-medium text-muted">Last Week</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">Total per week: {totalPerWeek}</p>
    </div>
  );
}

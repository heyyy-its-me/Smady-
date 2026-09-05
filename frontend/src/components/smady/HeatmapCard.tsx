import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HeatmapCardProps {
  dailyActivity: Record<string, number>;
  testId?: string;
}

const WEEKS = 12;
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function intensityClass(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-primary-50 border border-primary-100";
  const r = value / max;
  if (r < 0.2) return "bg-primary-100";
  if (r < 0.4) return "bg-primary-200";
  if (r < 0.6) return "bg-primary-400";
  if (r < 0.8) return "bg-primary-500";
  return "bg-primary-600";
}

export function HeatmapCard({ dailyActivity, testId }: HeatmapCardProps) {
  const { cells, weeks, weekMonthLabels, totalCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const total = WEEKS * 7;
    const allCells: { date: string; value: number; dow: number }[] = [];
    for (let i = total - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      allCells.push({ date: key, value: dailyActivity[key] ?? 0, dow: d.getDay() });
    }
    const weekGroups: typeof allCells[] = [];
    const monthLabels: string[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const slice = allCells.slice(w * 7, (w + 1) * 7);
      weekGroups.push(slice);
      const firstDate = new Date(slice[0].date);
      monthLabels.push(w % 4 === 0 ? MONTH_NAMES[firstDate.getMonth()] : "");
    }
    const totalCount = allCells.reduce((s, c) => s + c.value, 0);
    return { cells: allCells, weeks: weekGroups, weekMonthLabels: monthLabels, totalCount };
  }, [dailyActivity]);

  const maxVal = Math.max(...cells.map((c) => c.value), 1);

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-card" data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-ink">Activity Heatmap</p>
          <p className="mt-1 text-xs text-muted">{totalCount} leads sourced over the last 12 weeks</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <span>Less</span>
          {["bg-primary-50 border border-primary-100", "bg-primary-100", "bg-primary-200", "bg-primary-400", "bg-primary-600"].map((cls, i) => (
            <div key={i} className={cn("h-3 w-3 rounded-sm", cls)} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-0.5">
          {/* Row labels */}
          <div className="mr-1 flex flex-col gap-0.5">
            <div className="h-4" />
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="flex h-3.5 w-6 items-center justify-end">
                <span className={cn("text-[9px] text-muted", i % 2 === 0 ? "invisible" : "")}>{d}</span>
              </div>
            ))}
          </div>
          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              <div className="flex h-4 items-start">
                <span className="text-[9px] text-muted">{weekMonthLabels[wi]}</span>
              </div>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={`${cell.date}: ${cell.value} lead${cell.value !== 1 ? "s" : ""}`}
                  className={cn(
                    "h-3.5 w-3.5 cursor-pointer rounded-sm transition-opacity hover:opacity-70",
                    intensityClass(cell.value, maxVal)
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AIInsightCardProps {
  dashboardStats: {
    leadsToday: { value: number };
    totalLeads: { value: number };
    leadsGrowth: { label: string; value: number }[];
    emailsSentComparison: { percent: number; trend: "up" | "down" };
    replyRateComparison: { percent: number; trend: "up" | "down" };
    leadSourceBreakdown: { name: string; value: number }[];
  };
  testId?: string;
}

export function AIInsightCard({ dashboardStats, testId }: AIInsightCardProps) {
  const { leadsGrowth, emailsSentComparison, replyRateComparison, leadSourceBreakdown, totalLeads } = dashboardStats;

  const peakMonth = leadsGrowth.reduce((best, d) => (d.value > best.value ? d : best), { label: "—", value: 0 });
  const topSource = leadSourceBreakdown.reduce((best, d) => (d.value > best.value ? d : best), { name: "—", value: 0 });

  let insightText = "";
  let trend: "up" | "down" | "neutral" = "neutral";

  if (emailsSentComparison.percent !== 0) {
    trend = emailsSentComparison.trend;
    if (trend === "up") {
      insightText = `Email activity is up ${emailsSentComparison.percent}% this week — your outbound momentum is accelerating.`;
    } else {
      insightText = `Email volume dipped ${Math.abs(emailsSentComparison.percent)}% this week. A new campaign could re-ignite the pipeline.`;
    }
  } else if (replyRateComparison.percent !== 0) {
    trend = replyRateComparison.trend;
    insightText = `Reply rate is ${trend === "up" ? "up" : "down"} ${Math.abs(replyRateComparison.percent)}% vs last week. ${trend === "up" ? "Great engagement — keep the momentum." : "Try a different subject line to boost opens."}`;
  } else if (peakMonth.value > 0) {
    trend = "up";
    insightText = `Your strongest month was ${peakMonth.label} with ${peakMonth.value.toLocaleString()} leads sourced. Keep the cadence to beat it.`;
  } else if (totalLeads.value > 0) {
    trend = "neutral";
    insightText = `${totalLeads.value.toLocaleString()} total leads in your pipeline. Top source: ${topSource.name} (${topSource.value}% of pipeline).`;
  } else {
    trend = "neutral";
    insightText = "Generate your first batch of leads to unlock AI-powered insights about your outbound performance.";
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 shadow-card"
      data-testid={testId}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Sparkles className="h-4 w-4 text-white" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] font-semibold text-white/80 uppercase tracking-wide">AI Insight</p>
      </div>

      <div className="mt-5 flex-1">
        <TrendIcon className="mb-3 h-8 w-8 text-white/40" strokeWidth={1.5} />
        <p className="text-[15px] font-medium leading-relaxed text-white">{insightText}</p>
      </div>

      <div className="mt-5 rounded-xl bg-white/10 px-3 py-2">
        <p className="text-[11px] text-white/50">Computed from your real-time data · updates on refresh</p>
      </div>
    </div>
  );
}

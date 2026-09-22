import type { ReactNode } from "react";
import { ComposedChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatDatum } from "@/types";

const COLORS = ["#F9622C", "#FB8544", "#FFA870", "#FFC9A8", "#FFE6D6"];

function CardShell({ title, subtitle, children, testId, className }: { title: string; subtitle?: string; children: ReactNode; testId?: string; className?: string }) {
  return (
    <div className={cn("relative flex h-full flex-col rounded-2xl bg-surface p-6 shadow-card", className)} data-testid={testId}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        <button className="text-muted hover:text-ink">
          <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function AreaChartCard({
  title,
  subtitle,
  data,
  annotation,
  testId,
}: {
  title: string;
  subtitle?: string;
  data: StatDatum[];
  annotation?: { label: string };
  testId?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <CardShell title={title} subtitle={subtitle} testId={testId}>
        <div className="mt-2 flex h-[280px] items-center justify-center text-sm text-muted">No data available</div>
      </CardShell>
    );
  }

  const peakIndex = data.reduce((maxIdx, d, i, arr) => (d.value > arr[maxIdx].value ? i : maxIdx), 0);
  const leftPct = data.length > 1 ? (peakIndex / (data.length - 1)) * 100 : 50;
  const clampedLeftPct = Math.min(85, Math.max(15, leftPct));
  const peak = data[peakIndex];
  const totalThisYear = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <CardShell title={title} subtitle={subtitle} testId={testId}>
      <div className="relative mt-2 flex flex-1 flex-col">
        {annotation && (
          <div
            className="absolute z-10 flex max-w-[220px] -translate-x-1/2 flex-col items-center"
            style={{ left: `${clampedLeftPct}%`, top: "0px" }}
            data-testid="chart-annotation-callout"
          >
            <div
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink shadow-lg"
              style={{ background: "linear-gradient(135deg,#FDE68A,#BEF264)" }}
            >
              {annotation.label}
            </div>
            <div className="h-5 w-px bg-gradient-to-b from-[#BEF264] to-transparent" />
          </div>
        )}
        <div className="mt-10 h-[280px] w-full">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FDA987" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FDA987" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#A39A93" }} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F1E9E3" }} />
              <Bar dataKey="value" fill="#FFE6D6" fillOpacity={0.5} radius={[4, 4, 0, 0]} barSize={14} isAnimationActive={false} />
              <Area type="monotone" dataKey="value" stroke="#F9622C" strokeWidth={2.5} fill="url(#areaFill)" dot={false} isAnimationActive={false} />
              {peak && <ReferenceDot x={peak.label} y={peak.value} r={5} fill="#E24D1B" stroke="#fff" strokeWidth={2} isFront />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary-500" /> New Leads
          </span>
          <span className="font-medium text-ink">Total this year: {totalThisYear.toLocaleString()}</span>
        </div>
      </div>
    </CardShell>
  );
}

export function BarChartCard({ title, subtitle, data, testId, className, chartHeight = 220 }: { title: string; subtitle?: string; data: StatDatum[]; testId?: string; className?: string; chartHeight?: number }) {
  // Chart labels (Wed) now visible with increased bottom margin
  if (!data || data.length === 0) {
    return (
      <CardShell title={title} subtitle={subtitle} testId={testId} className={className}>
        <div className="h-[220px] flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted">No campaigns with sent emails yet</p>
          <p className="text-xs text-muted mt-1">Send your first campaign to see performance metrics</p>
        </div>
      </CardShell>
    );
  }
  return (
    <CardShell title={title} subtitle={subtitle} testId={testId} className={className}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 16, right: 48, left: 0, bottom: 28 }} barCategoryGap="30%">
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#A39A93" }} />
          <YAxis hide />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F1E9E3" }} />
          <Bar dataKey="value" fill="#F9622C" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </CardShell>
  );
}

export function MultiLineChartCard({
  title,
  subtitle,
  data,
  testId,
  className,
  chartHeight = 260,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; [key: string]: string | number }>;
  testId?: string;
  className?: string;
  chartHeight?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <CardShell title={title} subtitle={subtitle} testId={testId} className={className}>
        <div className="h-[260px] flex flex-col items-center justify-center text-center">
          <p className="text-sm text-muted">No email data available yet</p>
          <p className="text-xs text-muted mt-1">Send campaigns to see email delivery trends</p>
        </div>
      </CardShell>
    );
  }

  // Determine which keys to plot (exclude 'label')
  const lineKeys = Object.keys(data[0] || {}).filter(k => k !== "label");
  const colors = ["#F9622C", "#22C55E", "#171412", "#3B82F6", "#8B5CF6"];
  const legendLabels: Record<string, string> = {
    sent: "Sent", opened: "Opened", replied: "Replied",
    generated: "Generated", accepted: "Accepted", pending: "Pending",
    emails: "Emails"
  };
  const gradientId = `softGlow-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <CardShell title={title} subtitle={subtitle} testId={testId} className={className}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={data} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[0]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors[0]} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#A39A93" }} />
          <YAxis hide />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F1E9E3" }} />
          {lineKeys.length > 0 && lineKeys.map((key, idx) => (
            <Area
              key={`area-${key}`}
              type="monotone"
              dataKey={key}
              stroke={colors[idx % colors.length]}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs text-muted flex-wrap">
        {lineKeys.map((key, idx) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            {legendLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
          </span>
        ))}
      </div>
    </CardShell>
  );
}

export function DonutChartCard({ title, subtitle, data, testId }: { title: string; subtitle?: string; data: { name: string; value: number }[]; testId?: string }) {
  return (
    <CardShell title={title} subtitle={subtitle} testId={testId}>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="55%" height={180}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F1E9E3" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-body">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name}
              </span>
              <span className="font-semibold text-ink">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

export function FunnelChartCard({ title, subtitle, data, testId }: { title: string; subtitle?: string; data: { stage: string; value: number }[]; testId?: string }) {
  if (!data || data.length === 0) {
    return (
      <CardShell title={title} subtitle={subtitle} testId={testId}>
        <div className="h-[220px] flex items-center justify-center text-muted text-sm">No data available</div>
      </CardShell>
    );
  }
  const max = data[0]?.value || 1;
  return (
    <CardShell title={title} subtitle={subtitle} testId={testId}>
      <div className="mt-4 space-y-3">
        {data.map((d, i) => (
          <div key={d.stage}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-body">{d.stage}</span>
              <span className="font-semibold text-ink">{d.value}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-primary-50">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${(d.value / max) * 100}%`, opacity: 1 - i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

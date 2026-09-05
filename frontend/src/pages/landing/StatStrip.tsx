import { useCountUp } from "@/hooks/useCountUp";
import { SectionReveal } from "@/components/smady/SectionReveal";

const stats = [
  { value: 10000, suffix: "+", label: "Leads Sourced" },
  { value: 40, suffix: "%", label: "Avg. Reply Rate" },
  { value: 5, suffix: " min", label: "Avg. Setup Time" },
];

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const count = useCountUp(value, 900);
  return (
    <div className="text-center" data-testid={`hero-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="font-display text-3xl font-bold text-ink sm:text-4xl">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

export function StatStrip() {
  return (
    <SectionReveal className="mx-auto max-w-4xl px-6 py-6" >
      <div className="grid grid-cols-3 gap-6 rounded-2xl bg-white/70 py-8 shadow-soft backdrop-blur-sm sm:gap-10">
        {stats.map((s) => (
          <StatItem key={s.label} {...s} />
        ))}
      </div>
    </SectionReveal>
  );
}

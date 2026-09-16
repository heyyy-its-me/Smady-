import { motion } from "framer-motion";

export function RadialGauge({ value, target, label }: { value: number; target: number; label: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center" data-testid="radial-gauge">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1E9E3" strokeWidth="10" />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#F9622C"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-ink">{value}</span>
          <span className="text-[10px] font-medium text-muted">/ {target} goal</span>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn, slug } from "@/lib/utils";

interface MultiSelectChipsProps {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  label?: string;
  testId?: string;
}

export function MultiSelectChips({ options, value, onChange, label, testId }: MultiSelectChipsProps) {
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-soft" data-testid={testId}>
      {label && <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <motion.button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              whileTap={{ scale: 0.95 }}
              data-testid={`chip-${slug(opt)}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150",
                selected
                  ? "scale-[1.03] border-primary-500 bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-md"
                  : "border-border bg-white text-body hover:border-primary-200 hover:text-ink",
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
              {opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

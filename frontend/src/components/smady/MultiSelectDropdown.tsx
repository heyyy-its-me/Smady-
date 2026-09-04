import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, slug } from "@/lib/utils";

interface MultiSelectDropdownProps {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  label?: string;
  placeholder?: string;
  icon?: LucideIcon;
  testId?: string;
}

export function MultiSelectDropdown({ options, value, onChange, label, placeholder = "Type or select...", icon: Icon, testId }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const available = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(query.toLowerCase()));
  const addTag = (opt: string) => {
    onChange([...value, opt]);
    setQuery("");
  };
  const removeTag = (opt: string) => onChange(value.filter((v) => v !== opt));

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</label>}
      <div
        onClick={() => setOpen(true)}
        data-testid={testId}
        className="flex min-h-[44px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-150 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-200"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />}
        {value.map((v) => (
          <span key={v} data-testid={`tag-${slug(v)}`} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600">
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(v);
              }}
              data-testid={`remove-tag-${slug(v)}`}
              className="hover:text-primary-800"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </div>
      {open && available.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-nav">
          {available.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => addTag(opt)}
              data-testid={`option-${slug(opt)}`}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

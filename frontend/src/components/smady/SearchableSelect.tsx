import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn, slug } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
  subtitle?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  testId,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref} data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm text-ink"
      >
        <span className={cn(!selected && "text-muted-foreground")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 text-muted" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-white p-2 shadow-nav">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border px-2 py-1">
            <Search className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                data-testid={`select-option-${slug(o.label)}`}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-50"
              >
                {o.label}
                {o.subtitle && <span className="ml-1 text-xs text-muted">{o.subtitle}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

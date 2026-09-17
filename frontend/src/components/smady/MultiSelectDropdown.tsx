import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Close only if click is outside BOTH the component AND the dropdown portal
      if (ref.current && !ref.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Track dropdown position for Portal rendering (fixed viewport-based)
  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const available = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(query.toLowerCase()));
  const addTag = (opt: string) => {
    onChange([...value, opt]);
    setQuery("");
  };
  const removeTag = (opt: string) => onChange(value.filter((v) => v !== opt));

  return (
    <div ref={ref} className="group relative">
      {label && <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</label>}
      <div
        onClick={() => setOpen(true)}
        data-testid={testId}
        className="flex min-h-[44px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-200 focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:shadow-[0_4px_16px_-4px_rgba(249,98,44,0.25)]"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted transition-colors duration-150 group-focus-within:text-primary-500" strokeWidth={1.5} />}
        <AnimatePresence initial={false}>
          {value.map((v) => (
            <motion.span
              key={v}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              data-testid={`tag-${slug(v)}`}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-500 to-accent px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(v);
                }}
                data-testid={`remove-tag-${slug(v)}`}
                className="hover:text-white/70"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
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
      {open && available.length > 0 && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-nav"
          style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px`, width: `${dropdownPos.width}px` }}
        >
          {available.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addTag(opt);
                setOpen(false);
              }}
              data-testid={`option-${slug(opt)}`}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary-600"
            >
              {opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

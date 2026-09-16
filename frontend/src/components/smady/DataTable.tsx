import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export function DataTable<T extends { id: string }>({ columns, rows, testId }: { columns: Column<T>[]; rows: T[]; testId?: string }) {
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortable && <ChevronDown className="h-3 w-3" strokeWidth={1.5} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
                className="border-b border-border/60 transition-colors hover:bg-primary-50/40"
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-4", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

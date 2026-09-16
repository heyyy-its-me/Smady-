import { useEffect, useState } from "react";
import { History, ChevronDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/smady/Badge";
import { api } from "@/lib/api";

interface RunSummary {
  request_id: string;
  status: string;
  total_count: number;
  filters: Record<string, unknown>;
  created_at: string;
}

function filterSummary(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of ["industries", "roles", "countries", "cities"]) {
    const v = filters[key];
    if (Array.isArray(v) && v.length) parts.push(v.slice(0, 2).join(", ") + (v.length > 2 ? ` +${v.length - 2}` : ""));
  }
  return parts.length ? parts.join(" · ") : "No filters";
}

export function RunHistoryPicker({ selectedRunId, onSelect }: { selectedRunId: string | null; onSelect: (runId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/leads/runs")
      .then(({ data }) => setRuns(data))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="leads-run-history-button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-body shadow-soft transition-colors hover:bg-primary-50 hover:text-primary-600"
        >
          <History className="h-4 w-4" strokeWidth={1.5} />
          Run History
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-2" align="start" data-testid="leads-run-history-panel">
        <p className="px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">Past Executions</p>
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          </div>
        )}
        {!loading && runs.length === 0 && <p className="px-2 py-4 text-sm text-muted">No previous runs yet.</p>}
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {runs.map((r) => (
            <button
              key={r.request_id}
              type="button"
              onClick={() => {
                onSelect(r.request_id);
                setOpen(false);
              }}
              data-testid={`leads-run-item-${r.request_id}`}
              className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selectedRunId === r.request_id ? "border-primary-300 bg-primary-50/70" : "border-transparent hover:bg-bg"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">{filterSummary(r.filters)}</span>
                <span className="shrink-0 font-semibold text-primary-600">{r.total_count} leads</span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

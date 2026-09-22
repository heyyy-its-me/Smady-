import { useEffect, useState } from "react";
import { History, ChevronDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/smady/Badge";
import { api } from "@/lib/api";

interface IcpSummary {
  request_id: string;
  company_name: string;
  product_name: string;
  created_at: string;
  result?: Record<string, unknown>;
}

export function IcpHistoryPicker({ selectedIcpId, onSelect }: { selectedIcpId: string | null; onSelect: (icpId: string, icp: IcpSummary) => void }) {
  const [open, setOpen] = useState(false);
  const [icps, setIcps] = useState<IcpSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/icp/list")
      .then(({ data }) => setIcps(data))
      .catch(() => setIcps([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="icp-history-button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-body shadow-soft transition-colors hover:bg-primary-50 hover:text-primary-600"
        >
          <History className="h-4 w-4" strokeWidth={1.5} />
          ICP History
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-2" align="start" data-testid="icp-history-panel">
        <p className="px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">Past ICPs Generated</p>
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          </div>
        )}
        {!loading && icps.length === 0 && <p className="px-2 py-4 text-sm text-muted">No previous ICPs yet.</p>}
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {icps.map((i) => (
            <button
              key={i.request_id}
              type="button"
              onClick={() => {
                onSelect(i.request_id, i);
                setOpen(false);
              }}
              data-testid={`icp-item-${i.request_id}`}
              className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selectedIcpId === i.request_id ? "border-primary-300 bg-primary-50/70" : "border-transparent hover:bg-bg"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{i.product_name}</span>
                <span className="text-xs text-muted">{i.company_name}</span>
              </div>
              <div className="text-xs text-muted">
                {new Date(i.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

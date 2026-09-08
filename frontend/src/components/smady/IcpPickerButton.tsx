import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";

interface SavedIcp {
  request_id: string;
  company_name: string;
  product_name: string;
  created_at: string;
  result: { industry: string[]; targetRoles: string[]; geography: string[] };
}

export function IcpPickerButton({ onApply }: { onApply: (icp: SavedIcp["result"]) => void }) {
  const [open, setOpen] = useState(false);
  const [icps, setIcps] = useState<SavedIcp[]>([]);
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
          data-testid="leads-apply-icp-button"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-body shadow-soft transition-colors hover:bg-primary-50 hover:text-primary-600"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          Apply Saved ICP
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start" data-testid="leads-icp-picker-panel">
        <p className="px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">Your Saved ICPs</p>
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          </div>
        )}
        {!loading && icps.length === 0 && <p className="px-2 py-4 text-sm text-muted">No ICPs generated yet.</p>}
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {icps.map((icp) => (
            <button
              key={icp.request_id}
              type="button"
              onClick={() => {
                onApply(icp.result);
                setOpen(false);
              }}
              data-testid={`leads-icp-item-${icp.request_id}`}
              className="flex w-full flex-col gap-0.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-bg"
            >
              <span className="text-sm font-semibold text-ink">{icp.company_name || "Untitled"}</span>
              <span className="text-xs text-muted">
                {icp.product_name ? `${icp.product_name} · ` : ""}
                {new Date(icp.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

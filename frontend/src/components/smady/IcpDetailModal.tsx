import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Lightbulb, TrendingUp, Gauge } from "lucide-react";
import type { ICPResult } from "@/types";

function Block({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div data-testid={`icp-detail-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary-700">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-body">{value}</p>
    </div>
  );
}

export function IcpDetailModal({ icp, open, onOpenChange }: { icp: ICPResult | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!icp) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" data-testid="icp-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" strokeWidth={1.5} /> Complete ICP Analysis
          </DialogTitle>
        </DialogHeader>

        {typeof icp.confidenceScore === "number" && (
          <div className="flex items-center gap-2 rounded-xl border border-primary-100/70 bg-primary-50/50 p-3.5" data-testid="icp-detail-confidence">
            <Gauge className="h-4 w-4 text-primary-600" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-ink">Confidence Score: {Math.round(icp.confidenceScore * 100)}%</p>
          </div>
        )}

        <div className="space-y-4 border-b border-border pb-4">
          <Block label="Positioning" value={icp.positioning} />
          <Block label="Differentiator" value={icp.differentiator} />
          <Block label="Core Problem" value={icp.coreProblem} />
          <Block label="Buyer Pain" value={icp.buyerPain} />
        </div>

        {(icp.industry?.length || icp.targetRoles?.length || icp.companySize?.length || icp.geography?.length || icp.painPoints?.length) && (
          <div className="space-y-4 border-b border-border py-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary-700">Core Profile</p>
            {icp.industry?.length > 0 && (
              <div data-testid="icp-detail-industry">
                <p className="text-[10px] font-bold text-primary-600 mb-2">Industries</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.industry.map((item) => (
                    <span key={item} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {icp.geography?.length > 0 && (
              <div data-testid="icp-detail-geography">
                <p className="text-[10px] font-bold text-primary-600 mb-2">Geography</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.geography.map((item) => (
                    <span key={item} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {icp.targetRoles?.length > 0 && (
              <div data-testid="icp-detail-roles">
                <p className="text-[10px] font-bold text-primary-600 mb-2">Target Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.targetRoles.map((item) => (
                    <span key={item} className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {icp.companySize?.length > 0 && (
              <div data-testid="icp-detail-company-size">
                <p className="text-[10px] font-bold text-primary-600 mb-2">Company Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.companySize.map((item) => (
                    <span key={item} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {icp.painPoints?.length > 0 && (
              <div data-testid="icp-detail-pain-points">
                <p className="text-[10px] font-bold text-primary-600 mb-2">Key Pain Points</p>
                <ul className="space-y-2">
                  {icp.painPoints.map((pain, i) => (
                    <li key={i} className="flex gap-2 text-sm text-body">
                      <span className="shrink-0 text-primary-500 font-bold">•</span>
                      <span>{pain}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {(icp.gtmChannels?.length || icp.gtmRegions?.length) ? (
          <div className="space-y-3 border-b border-border py-4">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-700">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} /> Go-To-Market Strategy
            </p>
            {icp.gtmRegions && icp.gtmRegions.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="icp-detail-gtm-regions">
                {icp.gtmRegions.map((r) => (
                  <span key={r} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600">
                    {r}
                  </span>
                ))}
              </div>
            )}
            {icp.gtmChannels && icp.gtmChannels.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="icp-detail-gtm-channels">
                {icp.gtmChannels.map((c) => (
                  <span key={c} className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-body">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {icp.secondaryIcps && icp.secondaryIcps.length > 0 && (
          <div className="space-y-2 pt-4">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-700">
              <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} /> Secondary ICPs
            </p>
            {icp.secondaryIcps.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3" data-testid={`icp-detail-secondary-${i}`}>
                <p className="text-sm text-body">{s.icp}</p>
                <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-600">{s.score}/10</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

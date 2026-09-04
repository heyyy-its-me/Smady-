import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ dark = false, iconOnly = false }: { dark?: boolean; iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2" data-testid="smady-logo">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500">
        <Flame className="h-4.5 w-4.5 text-white" strokeWidth={1.5} />
      </div>
      {!iconOnly && (
        <span className={cn("font-display text-lg font-800 tracking-tight", dark ? "text-white" : "text-ink")}>
          Smady
        </span>
      )}
    </div>
  );
}

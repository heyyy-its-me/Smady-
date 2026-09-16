import type { LucideIcon } from "lucide-react";
import { CalendarCheck, Mail, UserPlus, MessageSquareText, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  meeting: { icon: CalendarCheck, bg: "bg-primary-50", color: "text-primary-600" },
  email: { icon: Mail, bg: "bg-sky-50", color: "text-sky-600" },
  lead: { icon: UserPlus, bg: "bg-emerald-50", color: "text-emerald-600" },
  reply: { icon: MessageSquareText, bg: "bg-amber-50", color: "text-amber-600" },
  proposal: { icon: FileCheck2, bg: "bg-violet-50", color: "text-violet-600" },
};

export interface ActivityItem {
  id: string;
  type: keyof typeof iconMap;
  title: string;
  subtitle: string;
  time: string;
}

export function ActivityFeed({ items, testId }: { items: ActivityItem[]; testId?: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-surface p-6 shadow-card" data-testid={testId}>
      <p className="text-[15px] font-semibold text-ink">Live Activity</p>
      <p className="mt-1 text-xs text-muted">Real-time updates from your outbound agent</p>
      <div className="relative mt-4 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none" style={{ maxHeight: 330 }}>
        <div className="pointer-events-none absolute bottom-2 left-[21px] top-2 w-px bg-border" />
        {items.map((item) => {
          const conf = iconMap[item.type];
          const Icon = conf.icon;
          return (
            <div
              key={item.id}
              className="relative flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-bg"
              data-testid={`activity-item-${item.id}`}
            >
              <div className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", conf.bg)}>
                <Icon className={cn("h-4 w-4", conf.color)} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug text-ink">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted">{item.subtitle}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted">{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

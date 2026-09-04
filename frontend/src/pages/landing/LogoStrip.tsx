import { Mail, Slack, Building2, Inbox } from "lucide-react";
import { SectionReveal } from "@/components/smady/SectionReveal";

const logos = [
  { label: "Gmail", icon: Mail },
  { label: "Outlook", icon: Inbox },
  { label: "Slack", icon: Slack },
  { label: "HubSpot", icon: Building2 },
];

export function LogoStrip() {
  return (
    <SectionReveal className="mx-auto max-w-5xl px-6 py-14 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Integrates with the tools your team already uses</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-10">
        {logos.map((l) => (
          <div key={l.label} className="flex items-center gap-2 text-body" data-testid={`integration-logo-${l.label.toLowerCase()}`}>
            <l.icon className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-sm font-semibold">{l.label}</span>
          </div>
        ))}
      </div>
    </SectionReveal>
  );
}

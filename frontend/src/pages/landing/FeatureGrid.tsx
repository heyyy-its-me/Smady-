import { Target, Users, Send, CalendarClock, FileText, BarChart3 } from "lucide-react";
import { SectionReveal } from "@/components/smady/SectionReveal";
import { EyebrowBadge } from "@/components/smady/Badge";

const features = [
  { icon: Target, title: "ICP Engine", description: "Turn your product and audience details into a precise ideal customer profile in seconds." },
  { icon: Users, title: "Automated Lead Sourcing", description: "Our agent finds verified leads that match your ICP, automatically." },
  { icon: Send, title: "Bulk Outreach", description: "Launch personalized email campaigns to hundreds of leads at once." },
  { icon: CalendarClock, title: "Smart Meeting Scheduling", description: "Interested replies are auto-converted into booked demo slots." },
  { icon: FileText, title: "AI Proposal Drafting", description: "Proposals are generated and sent automatically, with manual review when it matters." },
  { icon: BarChart3, title: "Reports & Analytics", description: "Track every stage of your funnel, from first email to closed deal." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <SectionReveal className="text-center">
        <div className="flex justify-center">
          <EyebrowBadge text="Built for Outbound Teams" />
        </div>
        <h2 className="mt-5 text-3xl font-bold text-ink">Everything Your Outbound Motion Needs, in One Place</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-body">
          From ICP to signed deal, Smady's agents handle the busywork so your reps focus on conversations that convert.
        </p>
      </SectionReveal>
      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <SectionReveal key={f.title} delay={i * 0.08}>
            <div className="h-full rounded-2xl bg-surface p-6 shadow-card" data-testid={`feature-card-${f.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                <f.icon className="h-6 w-6 text-primary-500" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{f.description}</p>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

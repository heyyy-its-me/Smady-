import { motion } from "framer-motion";
import { Target, Users, Mail, Calendar, FileText, BarChart3 } from "lucide-react";
import { SectionReveal } from "@/components/smady/SectionReveal";
import type { LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Target, title: "ICP Engine", description: "Turn a two-paragraph product description into a precise, data-backed ideal customer profile." },
  { icon: Users, title: "Lead Management", description: "Every lead our agents find, scored and qualified, organized in one place — ready to contact." },
  { icon: Mail, title: "Outreach", description: "Personalized email campaigns sent to hundreds of leads at once, without lifting a finger." },
  { icon: Calendar, title: "Meeting Scheduler", description: "Interested replies become booked demos automatically. See every meeting on one calendar." },
  { icon: FileText, title: "Proposal Generator", description: "Proposals drafted and sent by AI, with a manual review queue for the ones that need a second look." },
  { icon: BarChart3, title: "Reports & Analytics", description: "Every stage of your funnel, from first email to signed deal, tracked in real time." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionReveal>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-primary-500">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" /> Everything Outbound, in One Place
          </span>
          <h2 className="mt-4 font-display font-bold leading-tight tracking-tight text-ink" style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
            Six Agents. One Pipeline.
          </h2>
        </SectionReveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl bg-surface p-8 shadow-card"
              data-testid={`feature-card-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                <f.icon className="h-6 w-6 text-primary-500" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-ink">{f.title}</h3>
              <p className="mt-2.5 text-base leading-relaxed text-body">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

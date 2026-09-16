import { motion } from "framer-motion";
import { SectionReveal } from "@/components/smady/SectionReveal";

const steps = [
  {
    num: "01",
    title: "Describe Your Product",
    desc: "Tell Smady about your product, your company, and the audience you're trying to reach.",
  },
  {
    num: "02",
    title: "Get Your ICP",
    desc: "Our engine analyzes your inputs and builds a precise, data-backed ideal customer profile in seconds.",
  },
  {
    num: "03",
    title: "Leads Get Sourced Automatically",
    desc: "Our sourcing agent finds and verifies leads that match your ICP — no manual searching required.",
  },
  {
    num: "04",
    title: "Outreach, Meetings & Proposals — Handled",
    desc: "Emails go out, replies get triaged, meetings get booked, and proposals get drafted, automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden" style={{ background: "#FFF8F1" }}>
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-24">
        <SectionReveal>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-primary-500">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" /> How It Works
          </span>
          <h2
            className="mt-4 font-display font-bold leading-[1.1] tracking-tight text-ink"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
          >
            From Product Description to Booked Meeting.
          </h2>
        </SectionReveal>

        <div className="mt-14 divide-y divide-border">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-8 py-8"
              data-testid={`how-it-works-step-${i + 1}`}
            >
              <span
                className="shrink-0 font-display font-bold leading-none text-primary-light select-none"
                style={{ fontSize: "clamp(2.75rem, 6vw, 4rem)" }}
              >
                {step.num}
              </span>
              <div className="pt-2">
                <h3 className="font-display text-xl font-bold text-ink">{step.title}</h3>
                <p className="mt-2 max-w-xl text-base leading-relaxed text-body">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

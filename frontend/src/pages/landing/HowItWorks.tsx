import { SectionReveal } from "@/components/smady/SectionReveal";

const steps = [
  "Describe your product & audience",
  "Get your Ideal Customer Profile",
  "Leads are sourced & contacted automatically",
  "Meetings get booked on your calendar",
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <SectionReveal className="text-center">
        <h2 className="text-3xl font-bold text-ink">How It Works</h2>
      </SectionReveal>
      <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <SectionReveal key={step} delay={i * 0.08}>
            <div className="text-center" data-testid={`how-it-works-step-${i + 1}`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white">{i + 1}</div>
              <p className="mt-4 text-sm font-medium text-ink">{step}</p>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

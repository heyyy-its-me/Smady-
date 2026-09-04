import { Link } from "react-router-dom";
import { SectionReveal } from "@/components/smady/SectionReveal";
import { ButtonPrimary } from "@/components/smady/Button";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <SectionReveal>
        <div className="rounded-2xl bg-ink px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to Put Your Outbound on Autopilot?</h2>
          <div className="mt-8 flex justify-center">
            <Link to="/signup">
              <ButtonPrimary data-testid="final-cta-start-free-button">Start Free</ButtonPrimary>
            </Link>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}

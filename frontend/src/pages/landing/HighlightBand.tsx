import { Link } from "react-router-dom";
import { SectionReveal } from "@/components/smady/SectionReveal";
import { EyebrowBadge } from "@/components/smady/Badge";
import { ButtonPrimary } from "@/components/smady/Button";

export function HighlightBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <SectionReveal>
        <div className="rounded-2xl bg-gradient-to-b from-primary-50 to-white p-12 text-center shadow-card">
          <div className="flex justify-center">
            <EyebrowBadge text="Zero Manual Work" />
          </div>
          <h2 className="mt-5 text-3xl font-bold text-ink">Set Your ICP Once. Let the Agents Run.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-body">
            Skip the manual prospecting. Smady's agents source, contact, and schedule — while you focus on closing.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/signup">
              <ButtonPrimary data-testid="highlight-band-start-free-button">Start Free</ButtonPrimary>
            </Link>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}

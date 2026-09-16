import { Link } from "react-router-dom";
import { SectionReveal } from "@/components/smady/SectionReveal";
import { ButtonPrimary } from "@/components/smady/Button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#FFF8F1" }}>
      <div className="blob-field">
        <div className="blob blob-orange" style={{ width: 420, height: 420, bottom: "-160px", left: "-80px" }} />
        <div className="blob blob-yellow" style={{ width: 360, height: 360, top: "-100px", right: "-60px" }} />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        <SectionReveal>
          <h2
            className="font-display font-bold leading-tight tracking-tight text-ink"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
          >
            Your Next Customer Is Already Out There.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-body">
            Set up your ICP in five minutes and let Smady do the rest.
          </p>
          <div className="mt-9 flex justify-center">
            <Link to="/signup">
              <ButtonPrimary
                data-testid="final-cta-start-free-button"
                className="px-8 py-4 text-lg shadow-[0_12px_32px_-8px_rgba(249,98,44,0.5)]"
              >
                Start Free
              </ButtonPrimary>
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

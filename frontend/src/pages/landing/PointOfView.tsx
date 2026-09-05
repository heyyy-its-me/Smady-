import { motion } from "framer-motion";

export function PointOfView() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#171412" }}>
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-32 text-center sm:py-36">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="font-display font-bold leading-[1.1] tracking-tight text-white"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            data-testid="point-of-view-heading"
          >
            Outbound Isn't a Volume Problem Anymore.
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-white/70">
            Every team can already send more emails than ever. The problem was never volume —
            it was knowing who to contact, when, and with what. Smady's agents handle the
            finding, the timing, and the follow-through, so the only decision left for your
            team is which deal to close first.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

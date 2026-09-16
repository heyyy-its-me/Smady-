import { motion } from "framer-motion";

export function EditorialSection() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#FFF9F0" }}>
      <div className="grain-texture" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-3xl">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-500">Our Point of View</span>
            <p
              className="mt-6 font-display font-black leading-[1.05] tracking-tight text-ink"
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}
            >
              AI is remarkably good at finding patterns.
              <span className="text-primary-500"> What it can't do</span> is know which
              pattern matters to your specific customer in this specific moment.
            </p>
            <p className="mt-8 text-lg leading-relaxed text-body">
              That's the gap Smady closes. The last ten percent — the difference between automated prospecting
              and a conversation that actually converts — has always been human judgment on top of machine
              efficiency. We built Smady to handle the machine part so your reps can focus on what only
              humans can do: listening, adapting, and closing.
            </p>
            <div className="mt-10 h-px bg-gradient-to-r from-primary-200 via-primary-400 to-transparent" />
            <p className="mt-6 text-sm font-medium text-muted">
              — The Smady team
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

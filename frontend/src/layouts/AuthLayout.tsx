import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

/* ─── Global CSS ─── */
const AUTH_CSS = `
  .auth-root {
    font-family: 'Inter', sans-serif;
    background: #080808;
    color: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .auth-root::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
    background-size: 64px 64px;
    z-index: 0;
  }
  .auth-input {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: #fff !important;
    border-radius: 12px !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease !important;
  }
  .auth-input:focus {
    border-color: rgba(249,115,22,0.55) !important;
    box-shadow: 0 0 0 3px rgba(249,115,22,0.1) !important;
    outline: none !important;
    background: rgba(249,115,22,0.03) !important;
  }
  .auth-input::placeholder { color: rgba(255,255,255,0.18) !important; }
  .auth-btn-primary {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
    color: #fff !important;
    border: none !important;
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
    box-shadow: 0 4px 16px rgba(249,115,22,0.28) !important;
  }
  .auth-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px) !important;
    box-shadow: 0 10px 30px rgba(249,115,22,0.42) !important;
  }
  .auth-btn-primary:active:not(:disabled) { transform: translateY(0) !important; }
  .auth-btn-primary:disabled { opacity: 0.5 !important; }
  .auth-label {
    color: rgba(255,255,255,0.38) !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.09em !important;
  }
  .auth-link { color: #f97316 !important; transition: color 0.15s; }
  .auth-link:hover { color: #fb923c !important; }
  @keyframes auth-hint {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .auth-hint { animation: auth-hint 0.28s ease forwards; }
  @keyframes demo-blink { 50% { opacity: 0; } }
  .demo-cursor { animation: demo-blink 0.8s step-end infinite; display: inline-block; width: 2px; height: 12px; background: #f97316; vertical-align: middle; margin-left: 1px; }
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(12px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .toast-in { animation: toast-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  @keyframes lead-row-in {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .lead-row-in { animation: lead-row-in 0.35s ease forwards; }
  @keyframes email-send {
    0%   { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
    100% { transform: translateX(40px) translateY(-30px) scale(0.5); opacity: 0; }
  }
  .email-send { animation: email-send 0.6s ease forwards; }
  @keyframes check-pop {
    0%  { transform: scale(0); }
    70% { transform: scale(1.2); }
    100%{ transform: scale(1); }
  }
  .check-pop { animation: check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

/* ─── Demo data ─── */
const ICP_FIELDS = [
  { label: "Industry", value: "SaaS / B2B Software", delay: 400 },
  { label: "Target Roles", value: "VP Sales, Head of Growth", delay: 900 },
  { label: "Company Size", value: "50–500 employees", delay: 1400 },
  { label: "Signal", value: "Series A–C funding", delay: 1900 },
];

const DEMO_LEADS = [
  { init: "SR", name: "Sarah Reynolds", co: "Verve Analytics", role: "VP Sales", score: 96, color: "#22c55e" },
  { init: "MK", name: "Marcus Kim", co: "Orbit Cloud", role: "Head of Growth", score: 91, color: "#f97316" },
  { init: "LP", name: "Laura Patel", co: "Structify Inc.", role: "VP Sales", score: 88, color: "#22c55e" },
  { init: "AT", name: "Aisha Tanaka", co: "NovaMetrics", role: "Head of Growth", score: 94, color: "#a855f7" },
];

const OUTREACH_EMAIL = {
  to: "sarah@verveanalytics.com",
  subject: "Quick question about Verve's Q4 pipeline",
  preview: "Hi Sarah, noticed Verve just closed a Series B — congrats! We help sales leaders like you build pipeline 3× faster…",
};

const MEETING_SLOT = { day: "Thu", date: "18 Sep", time: "2:30 PM IST", lead: "Sarah Reynolds" };

const TESTIMONIALS = [
  { text: "We replaced 3 SDRs with Smady. Pipeline tripled. The ROI was immediate.", name: "Arun S.", role: "VP Sales, SaaS company", bg: "#8B3A8B" },
  { text: "Smady's proposal agent caught pricing errors I would have missed. Saved a $18K deal.", name: "Leo P.", role: "Enterprise AE", bg: "#1A5C9A" },
  { text: "14% reply rate on cold outreach. We were at 1.8% before. Night and day.", name: "Priya M.", role: "Founder, B2B Startup", bg: "#2D6A4F" },
];

/* ─── Typewriter hook ─── */
function useTypewriter(text: string, speed = 32, startDelay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(iv); setDone(true); }
      }, speed);
      return () => clearInterval(iv);
    }, startDelay);
    return () => clearTimeout(t);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

/* ─── Stage label ─── */
function StageTag({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
    </div>
  );
}

/* ──────────────────────────────────────
   STAGE 0: ICP Builder
────────────────────────────────────── */
function StageICP({ onDone }: { onDone: () => void }) {
  const [visibleFields, setVisibleFields] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    ICP_FIELDS.forEach((f, i) => {
      timers.push(setTimeout(() => setVisibleFields(i + 1), f.delay));
    });
    timers.push(setTimeout(() => { setFinished(true); }, 2800));
    timers.push(setTimeout(onDone, 3600));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div>
      <StageTag label="Step 1 — Building your ICP" color="#f97316" />
      <div className="space-y-3">
        {ICP_FIELDS.slice(0, visibleFields).map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{f.label}</p>
            <TypewriterLine text={f.value} speed={28} />
          </motion.div>
        ))}
      </div>
      {finished && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <div className="check-pop flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#22c55e" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <span className="text-[13px] font-semibold text-white">ICP built — searching for leads…</span>
        </motion.div>
      )}
    </div>
  );
}

function TypewriterLine({ text, speed = 30 }: { text: string; speed?: number }) {
  const { displayed, done } = useTypewriter(text, speed, 80);
  return (
    <span className="text-[13px] font-semibold text-white">
      {displayed}
      {!done && <span className="demo-cursor" />}
    </span>
  );
}

/* ──────────────────────────────────────
   STAGE 1: Leads appearing
────────────────────────────────────── */
function StageLeads({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    DEMO_LEADS.forEach((_, i) => {
      timers.push(setTimeout(() => setCount(i + 1), i * 700 + 300));
    });
    timers.push(setTimeout(onDone, DEMO_LEADS.length * 700 + 1200));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div>
      <StageTag label="Step 2 — Qualified Leads Found" color="#22c55e" />
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[28px] font-[900] text-white">{count}</span>
        <div>
          <p className="text-[12px] font-semibold text-white">leads matched</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>ICP score {'>'}85 · verified emails</p>
        </div>
        {count > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
            ↑ 94% avg score
          </motion.div>
        )}
      </div>
      <div className="space-y-2">
        {DEMO_LEADS.slice(0, count).map((lead, i) => (
          <motion.div
            key={lead.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: `hsl(${lead.init.charCodeAt(0) * 17 % 360},55%,32%)` }}>
              {lead.init}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">{lead.name}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{lead.role} · {lead.co}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="h-1.5 w-10 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lead.score}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: lead.color }}
                />
              </div>
              <span className="text-[11px] font-bold" style={{ color: lead.color }}>{lead.score}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   STAGE 2: Outreach email
────────────────────────────────────── */
function StageOutreach({ onDone }: { onDone: () => void }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSending(true), 1200);
    const t2 = setTimeout(() => { setSending(false); setSent(true); }, 2000);
    const t3 = setTimeout(onDone, 3600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div>
      <StageTag label="Step 3 — Personalised Outreach" color="#a855f7" />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Email header */}
        <div className="px-4 py-3 border-b" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>To</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>{OUTREACH_EMAIL.to}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>Re</span>
            <span className="text-[11px] font-semibold text-white">{OUTREACH_EMAIL.subject}</span>
          </div>
        </div>
        {/* Email body */}
        <div className="px-4 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{OUTREACH_EMAIL.preview}</p>
        </div>
        {/* Send button state */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {!sent ? (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 w-fit ${sending ? "opacity-60" : ""}`} style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
              {sending ? (
                <>
                  <div className="h-3 w-3 rounded-full border border-orange-400 border-t-transparent animate-spin" />
                  <span className="text-[12px] font-semibold text-orange-400">Sending…</span>
                </>
              ) : (
                <>
                  <span className="text-[12px]">✉️</span>
                  <span className="text-[12px] font-semibold text-orange-400">AI sends in 3s…</span>
                </>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                <span className="text-[12px] font-bold text-green-400">Sent to Sarah Reynolds</span>
              </div>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>+ 3 others queued</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   STAGE 3: Meeting booked
────────────────────────────────────── */
function StageMeeting({ onDone }: { onDone: () => void }) {
  const [booked, setBooked] = useState(false);
  const [replied, setReplied] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setReplied(true), 600);
    const t2 = setTimeout(() => setBooked(true), 1600);
    const t3 = setTimeout(onDone, 4000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div>
      <StageTag label="Step 4 — Meeting Auto-Booked" color="#22c55e" />

      {/* Reply card */}
      <AnimatePresence>
        {replied && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-xl p-3.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#1A5C9A" }}>SR</div>
              <span className="text-[11px] font-semibold text-white">Sarah Reynolds</span>
              <span className="ml-auto text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>just now</span>
            </div>
            <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.55)" }}>
              &ldquo;Very timely — we&apos;re evaluating this for Q4. Can we jump on a call this week?&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar card */}
      <AnimatePresence>
        {booked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(34,197,94,0.25)" }}
          >
            {/* Calendar header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.1)" }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="text-[12px] font-bold text-white">Meeting Confirmed</span>
              </div>
              <span className="rounded-full text-[10px] font-bold px-2 py-0.5" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>Auto-booked by AI</span>
            </div>
            {/* Slot */}
            <div className="px-4 py-4" style={{ background: "rgba(255,255,255,0.025)" }}>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>{MEETING_SLOT.day}</p>
                  <p className="text-[28px] font-[900] leading-none text-white">{MEETING_SLOT.date.split(" ")[0]}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{MEETING_SLOT.date.split(" ")[1]}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-white mb-0.5">Discovery Call</p>
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>with {MEETING_SLOT.lead}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{MEETING_SLOT.time} · 30 min</span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────
   MAIN RIGHT PANEL
────────────────────────────────────── */
const STAGES = ["icp", "leads", "outreach", "meeting"] as const;
type Stage = typeof STAGES[number];

function AuthRightPanel() {
  const [stage, setStage] = useState<Stage>("icp");
  const [tIndex, setTIndex] = useState(0);
  const nextStage = useCallback(() => {
    setStage(s => {
      const idx = STAGES.indexOf(s);
      const next = STAGES[(idx + 1) % STAGES.length];
      if (next === "icp") setTIndex(i => (i + 1) % TESTIMONIALS.length);
      return next;
    });
  }, []);

  const t = TESTIMONIALS[tIndex];

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: "linear-gradient(160deg, #0c0806 0%, #08080d 100%)" }}>
      {/* Subtle grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none" }} />
      {/* Orange glow */}
      <div style={{ position: "absolute", top: "15%", right: 0, width: 380, height: 380, background: "radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 65%)", borderRadius: "50%", filter: "blur(50px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", left: 0, width: 280, height: 280, background: "radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 65%)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />

      <div className="relative z-10 flex h-full flex-col p-8 gap-6">

        {/* ── Header ── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#f97316" }} />
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>Smady in action — live demo</p>
          </div>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.25)" }}>Watch the full pipeline work automatically</p>
        </div>

        {/* ── Stage indicator dots ── */}
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: stage === s ? 20 : 8, background: stage === s ? "#f97316" : "rgba(255,255,255,0.12)" }}
              />
            </div>
          ))}
          <span className="ml-2 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
            {stage === "icp" ? "Building ICP…" : stage === "leads" ? "Sourcing leads…" : stage === "outreach" ? "Sending outreach…" : "Booking meeting…"}
          </span>
        </div>

        {/* ── Demo card ── */}
        <div
          className="flex-1 overflow-hidden rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            minHeight: 0,
          }}
        >
          <AnimatePresence mode="wait">
            {stage === "icp" && (
              <motion.div key="icp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <StageICP onDone={nextStage} />
              </motion.div>
            )}
            {stage === "leads" && (
              <motion.div key="leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <StageLeads onDone={nextStage} />
              </motion.div>
            )}
            {stage === "outreach" && (
              <motion.div key="outreach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <StageOutreach onDone={nextStage} />
              </motion.div>
            )}
            {stage === "meeting" && (
              <motion.div key="meeting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <StageMeeting onDone={nextStage} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Rotating testimonial ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
              &ldquo;{t.text}&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white flex-shrink-0" style={{ background: t.bg }}>
                {t.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white leading-tight">{t.name}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="9" height="9" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"/></svg>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ─── Auth Layout export ─── */
export function AuthLayout({
  children,
  mode = "login",
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  mode?: "login" | "signup" | "forgot";
}) {
  useEffect(() => {
    const existing = document.getElementById("auth-css-v2");
    if (existing) return;
    const el = document.createElement("style");
    el.id = "auth-css-v2";
    el.textContent = AUTH_CSS;
    document.head.appendChild(el);
    return () => { document.getElementById("auth-css-v2")?.remove(); };
  }, []);

  return (
    <div className="auth-root grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]">
      {/* ── Left: Form ── */}
      <div className="relative flex flex-col justify-center overflow-hidden px-6 py-12 sm:px-12 lg:px-16" style={{ background: "#0a0a0a" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 380, height: 260, background: "radial-gradient(ellipse at 15% 0%, rgba(249,115,22,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
        {/* Logo — left only */}
        <Link to="/" className="relative z-10 mb-10 flex items-center gap-2.5 w-fit group">
          <img 
            src="https://res.cloudinary.com/kwyrhjzo/image/upload/v1790159384/smady_logo.png" 
            alt="Smady" 
            className="h-9 w-9 rounded-full object-cover transition-all group-hover:scale-105 shadow-lg"
          />
          <span className="text-[16px] font-bold tracking-tight text-white">Smady</span>
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
      {/* ── Right: Product demo panel — NO logo ── */}
      <div className="hidden overflow-hidden lg:block">
        <AuthRightPanel />
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/smady/Logo";

/* ─── Injected global styles (keyframes + custom classes) ─── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  .lv2-root {
    font-family: 'Inter', sans-serif;
    background: #080808;
    color: #fff;
    -webkit-font-smoothing: antialiased;
    --lv2-scroll-progress: 0;
  }

  /* Thin progress rail keeps long-form scrolling feeling intentional. */
  .lv2-scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 2px;
    pointer-events: none;
    background: rgba(255,255,255,0.06);
  }
  .lv2-scroll-progress span {
    display: block;
    width: 100%;
    height: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    background: linear-gradient(90deg, #f97316, #fb923c, #fde68a);
    box-shadow: 0 0 14px rgba(249,115,22,0.7);
    will-change: transform;
  }

  /* Fixed 64×64 dot-grid background */
  .lv2-root::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 64px 64px;
  }

  /* Orange radial glow blob (reusable) */
  .lv2-glow-orange {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%);
    pointer-events: none;
    filter: blur(40px);
  }

  /* Gradient border via pseudo-element */
  .lv2-card {
    position: relative;
  }
  .lv2-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg,
      rgba(255,255,255,0.12) 0%,
      rgba(255,255,255,0.04) 40%,
      rgba(249,115,22,0.10) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
  }
  .lv2-card:hover::before {
    background: linear-gradient(135deg,
      rgba(249,115,22,0.3) 0%,
      rgba(255,255,255,0.06) 50%,
      rgba(249,115,22,0.15) 100%
    );
    transition: background 0.4s ease;
  }

  /* Bento grid bottom fade mask */
  .lv2-bento-mask {
    -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
  }

  /* Fade-slide-in on scroll */
  @keyframes fadeSlideIn {
    from { opacity: 0; filter: blur(8px); transform: translateY(30px); }
    to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
  }
  .lv2-animate { opacity: 0; }
  .lv2-animate.visible { animation: fadeSlideIn 0.7s cubic-bezier(.22,1,.36,1) forwards; }

  /* Section-level reveal: transform/opacity only, so scrolling stays on the compositor. */
  .lv2-section-reveal {
    opacity: 0;
    transform: translate3d(0, 28px, 0);
    transition: opacity 0.85s cubic-bezier(.22,1,.36,1), transform 0.85s cubic-bezier(.22,1,.36,1);
  }
  .lv2-section-reveal.visible {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  @keyframes lv2-hero-rise {
    from { opacity: 0; transform: translate3d(0, 18px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }
  .lv2-hero-stage > :not(.lv2-glow-orange) {
    opacity: 0;
    animation: lv2-hero-rise 0.8s cubic-bezier(.22,1,.36,1) forwards;
  }
  .lv2-hero-stage > :nth-child(2) { animation-delay: 0.08s; }
  .lv2-hero-stage > :nth-child(3) { animation-delay: 0.18s; }
  .lv2-hero-stage > :nth-child(4) { animation-delay: 0.3s; }
  .lv2-hero-stage > :nth-child(5) { animation-delay: 0.42s; }

  /* Only a few ambient lights use parallax; content never moves while reading. */
  .lv2-parallax {
    transform: translate3d(0, var(--lv2-parallax-y, 0px), 0);
    will-change: transform;
  }

  /* Soft lift for journey cards gives the story a sense of progression. */
  .lv2-journey-shell { position: relative; }
  .lv2-journey-shell::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 4%;
    right: 4%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(249,115,22,0.32), rgba(96,165,250,0.32), transparent);
    pointer-events: none;
  }
  .lv2-journey-card {
    transition: transform 0.45s cubic-bezier(.22,1,.36,1), border-color 0.45s ease, background 0.45s ease;
  }
  .lv2-journey-card:hover { transform: translate3d(0, -7px, 0); }

  /* Orbit pulse rings */
  @keyframes orbit-pulse {
    0%, 100% { opacity: 0.25; transform: scale(1); }
    50%       { opacity: 0.5;  transform: scale(1.05); }
  }
  .lv2-ring { animation: orbit-pulse var(--d,3s) ease-in-out infinite; }

  /* Typewriter cursor blink */
  @keyframes blink { 50% { opacity: 0; } }
  .lv2-cursor { animation: blink 1s step-end infinite; }

  /* Nav button hover */
  .lv2-btn-primary {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .lv2-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(249,115,22,0.35);
  }

  /* Chart bar hover glow */
  .lv2-bar {
    transition: opacity 0.2s ease;
  }
  .lv2-bar:hover { opacity: 1 !important; }

  /* Stat counter */
  .lv2-stat-num {
    background: linear-gradient(135deg, #fff 0%, #aaa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Orange gradient text */
  .lv2-orange-text {
    background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Hover card orange tint */
  .lv2-hover-card:hover {
    background: rgba(249,115,22,0.05) !important;
    transition: background 0.3s ease;
  }

  /* Step connector line */
  .lv2-step-line {
    background: linear-gradient(to bottom, #f97316, transparent);
  }

  /* Glass nav */
  .lv2-nav {
    backdrop-filter: blur(20px) saturate(180%);
    background: rgba(8,8,8,0.8);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  /* Scrollbar */
  .lv2-root ::-webkit-scrollbar { width: 4px; }
  .lv2-root ::-webkit-scrollbar-track { background: #111; }
  .lv2-root ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

  /* ─────────── MOBILE RESPONSIVE ─────────── */
  @media (max-width: 767px) {

    /* NAV: hide center links, shrink padding */
    .lv2-nav { padding-left: 16px !important; padding-right: 16px !important; }

    /* HERO: smaller headline */
    .lv2-hero-h1 { font-size: 40px !important; line-height: 1.05 !important; }

    .lv2-journey-shell::before { display: none; }
    .lv2-journey-card:hover { transform: none; }

    /* BENTO GRID: break the fixed 12-col layout into a single column */
    .lv2-bento-grid {
      display: flex !important;
      flex-direction: column !important;
      height: auto !important;
      -webkit-mask-image: none !important;
      mask-image: none !important;
      overflow: hidden !important;
      border-radius: 16px !important;
    }
    /* Every direct child card spans full width regardless of grid-column inline style */
    .lv2-bento-grid > div {
      grid-column: unset !important;
      grid-row: unset !important;
      width: 100% !important;
    }
    /* Hero leads table: sensible height on mobile */
    .lv2-bento-hero { max-height: 440px !important; min-height: 320px !important; }
    /* Stat card */
    .lv2-bento-stat { min-height: 130px !important; }
    /* Code snippet: hide on mobile to keep layout clean */
    .lv2-bento-code { display: none !important; }
    /* Chart card */
    .lv2-bento-chart { min-height: 160px !important; }
    /* Global reach */
    .lv2-bento-global { min-height: 220px !important; }

    /* PROBLEM SECTION: smaller big heading */
    .lv2-problem-h2 { font-size: 44px !important; }

    /* METRICS: 2-col instead of 4-col */
    .lv2-metrics-grid {
      grid-template-columns: 1fr 1fr !important;
    }

    /* FOOTER: 2-col grid */
    .lv2-footer-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .lv2-footer-brand { grid-column: span 2 !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lv2-root *, .lv2-root *::before, .lv2-root *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
    .lv2-scroll-progress { display: none; }
    .lv2-section-reveal, .lv2-animate { opacity: 1 !important; transform: none !important; }
  }
`;


/* ─── Data ────────────────────────────────────────────────── */

const STEPS = [
  { icon: "🎯", label: "ICP Agent", desc: "Identify the companies, industries, markets, locations, and decision-makers that fit your ideal customer profile." },
  { icon: "🔍", label: "Lead Agent", desc: "Discover and enrich prospects that match your ICP, so you spend less time digging through lists." },
  { icon: "✉️", label: "Outreach Agent", desc: "Create personalized messages based on your product, ICP, and each prospect — without starting from a blank screen." },
  { icon: "📅", label: "Meeting Agent", desc: "Move interested prospects toward a real conversation while keeping the prospect and conversation context connected." },
  { icon: "📋", label: "Proposal Agent", desc: "Transform customer requirements and meeting insights into relevant proposals, faster." },
  { icon: "📈", label: "Sales Intelligence", desc: "Bring leads, conversations, meetings, proposals, and deals together so you know what happens next." },
];

const BARS = [88, 92, 95, 97, 96, 98, 97];
const BAR_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/* ─── Sub-components ─────────────────────────────────────── */

function ScrollProgress() {
  return (
    <div className="lv2-scroll-progress" aria-hidden="true">
      <span data-lv2-progress-bar="true" />
    </div>
  );
}

function NavBar() {
  return (
    <nav className="lv2-nav sticky top-0 z-50 flex items-center justify-between px-6 py-4 max-w-screen-xl mx-auto" style={{ position: "sticky", top: 0, zIndex: 50 }}>
      {/* Logo */}
      <div style={{ filter: "brightness(1.1)" }}>
        <Logo dark />
      </div>
      {/* Links */}
      <div className="hidden md:flex items-center gap-7">
        {["Platform", "Solutions", "Pricing", "Blog"].map(l => (
          <a key={l} href="#" className="text-[14px] text-neutral-400 font-medium transition-colors hover:text-white">{l}</a>
        ))}
      </div>
      {/* Right actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
          <span className="text-[12px] font-medium text-neutral-300">Live</span>
        </div>
        <Link
          to="/signup"
          className="lv2-btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
        >
          Start Free
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="lv2-hero-stage relative z-10 px-6 pt-20 pb-8 text-center max-w-screen-xl mx-auto">
      {/* Glow */}
      <div className="lv2-glow-orange" style={{ width: 600, height: 600, top: -200, left: "50%", transform: "translateX(-50%)" }} />
      {/* Pill */}
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-md">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>New</span>
        <span className="text-[13px] font-medium text-neutral-300">Your AI sales team, from ICP to proposal</span>
        <span className="lv2-orange-text text-[14px]">✦</span>
      </div>
      {/* Headline */}
      <h1 className="lv2-hero-h1 mx-auto max-w-4xl text-[44px] font-[900] leading-[1.02] tracking-[-0.04em] text-white md:text-[60px] lg:text-[68px]">
          Your AI Sales Team,<br />
          <span className="lv2-orange-text">From ICP to Proposal.</span>
      </h1>
      {/* Sub */}
      <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-neutral-400 md:text-[18px]">
        Tell Smady what you&apos;re building, and let AI help you figure out who to sell to, how to reach them, and what to do next.
      </p>
      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/signup"
          className="lv2-btn-primary flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white"
        >
          Start Free &mdash; It&apos;s Fast
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
        <a
          href="#how-it-works"
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[14px] font-medium text-neutral-300 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-orange-500/30 hover:text-white"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: "#f97316" }} />
          See How It Works
        </a>
      </div>
    </section>
  );
}

function BentoGrid() {
  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 pb-6">
      <div
        className="lv2-bento-mask lv2-bento-grid grid gap-3 overflow-hidden rounded-3xl"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gridTemplateRows: "auto",
          height: 820,
        }}
      >
        {/* ── Card 1: Live Leads Dashboard (col 1–6, row 1–2) ── */}
        <div
          className="lv2-card relative overflow-hidden rounded-2xl"
          style={{
            gridColumn: "1 / 7",
            gridRow: "1 / 3",
            background: "#0d0d0f",
          }}
        >
          {/* Subtle orange glow bottom-left */}
          <div className="lv2-glow-orange lv2-parallax" data-lv2-parallax="0.08" style={{ width: 500, height: 500, bottom: -180, left: -100, opacity: 0.3 }} />

          {/* Top bar — app chrome */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: "#f97316" }} />
              <span className="text-[12px] font-semibold tracking-tight text-neutral-300">Live Leads — Active Sourcing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-bold text-orange-400">Connected journey</span>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="relative z-10 grid grid-cols-[1fr_1fr_80px_90px] gap-3 border-b border-white/[0.04] px-5 py-2.5">
            {["Contact","Company","Score","Stage"].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">{h}</span>
            ))}
          </div>

          {/* Lead rows */}
          <div className="relative z-10 divide-y divide-white/[0.03]">
            {[
              { init:"SR", name:"Sarah Reynolds", co:"Verve Analytics", score:94, stage:"Meeting", sc:"#22c55e", si:"#16a34a", new:true },
              { init:"MK", name:"Marcus Kim", co:"Orbit Cloud", score:87, stage:"Outreach", sc:"#f97316", si:"#ea580c" },
              { init:"LP", name:"Laura Patel", co:"Structify Inc.", score:91, stage:"Meeting", sc:"#22c55e", si:"#16a34a" },
              { init:"JW", name:"James Wu", co:"Clearpath SaaS", score:78, stage:"Outreach", sc:"#f97316", si:"#ea580c" },
              { init:"AT", name:"Aisha Tanaka", co:"NovaMetrics", score:96, stage:"Proposal", sc:"#a855f7", si:"#9333ea", hot:true },
              { init:"RG", name:"Ryan Gomes", co:"Flowbase HQ", score:83, stage:"Outreach", sc:"#f97316", si:"#ea580c" },
              { init:"EN", name:"Elena Novak", co:"Stratix Labs", score:89, stage:"Meeting", sc:"#22c55e", si:"#16a34a" },
            ].map((lead, i) => (
              <div key={i} className="group grid grid-cols-[1fr_1fr_80px_90px] items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025]">
                {/* Contact */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: `hsl(${lead.init.charCodeAt(0) * 17 % 360},55%,32%)` }}>
                    {lead.init}
                    {lead.new && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-black" style={{ background: "#f97316" }} />}
                    {lead.hot && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-black" style={{ background: "#a855f7" }} />}
                  </div>
                  <span className="truncate text-[12.5px] font-semibold text-neutral-200">{lead.name}</span>
                </div>
                {/* Company */}
                <span className="truncate text-[12px] text-neutral-500">{lead.co}</span>
                {/* Score */}
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${lead.score}%`, background: lead.sc }} />
                  </div>
                  <span className="text-[12px] font-bold" style={{ color: lead.sc }}>{lead.score}</span>
                </div>
                {/* Stage */}
                <span className="w-fit rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold" style={{ background: `${lead.sc}18`, color: lead.sc, border: `1px solid ${lead.sc}30` }}>
                  {lead.stage}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom pipeline summary strip */}
          <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/[0.05]" style={{ background: "rgba(13,13,15,0.95)" }}>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-4">
                {[["ICP","Defined"],["Leads","Matched"],["Next","Step"]].map(([n,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="text-[14px] font-[800] text-white">{n}</span>
                    <span className="text-[11px] text-neutral-600">{l}</span>
                  </div>
                ))}
              </div>
              <div className="flex -space-x-2">
                {["SP","MK","AT","RG"].map((a,i) => (
                  <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border border-black text-[10px] font-bold text-white" style={{ background: `hsl(${i*90+30},55%,35%)` }}>{a}</div>
                ))}
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-black bg-neutral-800 text-[9px] font-bold text-neutral-400">→</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card 2: Stat (col 7–9, row 1) ── */}
        <div
          className="lv2-card lv2-hover-card relative overflow-hidden rounded-2xl p-6"
          style={{
            gridColumn: "7 / 10",
            gridRow: "1 / 2",
            background: "linear-gradient(145deg, #141414 0%, #111 100%)",
          }}
        >
          {/* Top orange line accent — like the reference's strong visual signal */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #f97316, #fb923c, transparent)" }} />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Sales Journey</p>
          <p style={{ fontSize: 58, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: "#fff" }}>
            ICP <span style={{ color: "#f97316" }}>→</span> Proposal
          </p>
          <p className="mt-2 text-[13px] text-neutral-500">one connected sales journey</p>
          <div className="mt-4 flex items-center gap-1.5 rounded-full w-fit px-3 py-1.5" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
            <span className="text-[11px] font-bold text-orange-400">Context carried forward</span>
          </div>
        </div>

        {/* ── Card 3: Code snippet (col 10–12, row 1) ── */}
        <div
          className="lv2-card lv2-hover-card relative overflow-hidden rounded-2xl p-5"
          style={{ gridColumn: "10 / 13", gridRow: "1 / 2", background: "#0f0f10" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="text-[11px] font-medium text-neutral-500">icp_config.json</span>
            <span className="ml-auto text-[10px] text-orange-500/60">live</span>
          </div>
          <pre className="text-[10.5px] leading-[1.7] text-neutral-400" style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
{`{
  "industry": "SaaS",
  "roles": [
    "VP Sales",
    "Head of Growth"
  ],
  "regions": ["US","UK","IN"],
  "signals": {
    "headcount": "50-500",
    "funding": "Series A-C"
  }
}`}
          </pre>
        </div>

        {/* ── Card 4: Chart (col 7–9, row 2) ── */}
        <div
          className="lv2-card lv2-hover-card relative overflow-hidden rounded-2xl p-5"
          style={{ gridColumn: "7 / 10", gridRow: "2 / 3", background: "#111113" }}
        >
          <p className="text-[13px] font-semibold text-white mb-0.5">Sales Journey</p>
          <p className="text-[11px] text-neutral-500 mb-4">From ICP to proposal</p>
          {/* Y-axis labels */}
          <div className="relative">
            <div className="absolute right-0 top-0 flex flex-col justify-between h-[80px] text-right">
              {["100%","80%","60%"].map(l => (
                <span key={l} className="text-[9px] text-neutral-700">{l}</span>
              ))}
            </div>
            {/* Bars */}
            <div className="flex items-end gap-1.5 h-[80px] pr-8">
              {BARS.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="lv2-bar w-full rounded-[3px]"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(to top, rgba(249,115,22,0.7), rgba(249,115,22,0.4))`,
                    }}
                  />
                  <span className="text-[9px] text-neutral-700">{BAR_DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ background: "#f97316" }} />
              <span className="text-[11px] text-neutral-500">Connected stages</span>
            </div>
            <span className="text-[12px] font-bold text-orange-400">Connected</span>
          </div>
        </div>

        {/* ── Card 5: Global reach (col 10–12, row 2) ── */}
        <div
          className="lv2-card lv2-hover-card relative overflow-hidden rounded-2xl p-5"
          style={{ gridColumn: "10 / 13", gridRow: "2 / 3", background: "#0d0d0f" }}
        >
          {/* Orange glow top-right */}
          <div className="lv2-glow-orange absolute -top-8 -right-8" style={{ width: 150, height: 150, opacity: 0.25 }} />
          <p className="text-[13px] font-semibold text-white mb-1">One connected journey</p>
          <p className="text-[11px] text-neutral-500 mb-4">Every step works from shared context</p>
          <div className="flex flex-col gap-2">
            {[
              { flag: "🎯", name: "Ideal customer profile", count: "01" },
              { flag: "🔍", name: "Qualified leads", count: "02" },
              { flag: "✉️", name: "Personalized outreach", count: "03" },
              { flag: "📅", name: "Sales meetings", count: "04" },
              { flag: "📋", name: "Relevant proposals", count: "05" },
            ].map(c => (
              <div key={c.name} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>{c.flag}</span>
                  <span className="text-[12px] font-medium text-neutral-400">{c.name}</span>
                </div>
                <span className="text-[11px] font-bold text-orange-400">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductJourney() {
  const journey = [
    { label: "Product", question: "What are you building?", color: "#f97316" },
    { label: "ICP Agent", question: "Who should I sell to?", color: "#fb923c" },
    { label: "Lead Agent", question: "Who matches my ICP?", color: "#fbbf24" },
    { label: "Outreach Agent", question: "How should I reach them?", color: "#a3e635" },
    { label: "Meeting Agent", question: "How do I turn interest into a conversation?", color: "#4ade80" },
    { label: "Proposal Agent", question: "How do I turn their needs into an offer?", color: "#2dd4bf" },
    { label: "Pipeline", question: "What happens next?", color: "#60a5fa" },
  ];

  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-16">
      <div className="mb-10 text-center">
        <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-[12px] font-medium text-orange-400">
          The complete journey
        </span>
        <h2 className="mt-5 text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          From Product to Pipeline —<br /><span className="lv2-orange-text">With AI Along the Way.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-neutral-400">
          One connected journey. Powered by specialized AI agents.
        </p>
      </div>
      <div className="lv2-journey-shell grid grid-cols-1 gap-3 md:grid-cols-7">
        {journey.map((step, i) => (
          <div key={step.label} className="relative flex items-stretch">
            <div className="lv2-card lv2-hover-card lv2-journey-card flex w-full flex-col rounded-2xl p-4" style={{ background: "#0f0f10" }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: step.color }}>0{i + 1}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: step.color, boxShadow: `0 0 12px ${step.color}` }} />
              </div>
              <h3 className="text-[14px] font-bold text-white">{step.label}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">{step.question}</p>
            </div>
            {i < journey.length - 1 && <span className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 text-orange-500 md:-right-3 md:bottom-auto md:left-auto md:top-1/2 md:translate-x-0 md:-translate-y-1/2">→</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      {/* Header row — "The problem." + vertical line + subtitle */}
      <div className="mb-12 flex flex-col gap-4 border-b border-white/[0.06] pb-10 md:flex-row md:items-start md:gap-0">
        <h2 className="flex-1 text-[64px] font-[900] leading-none tracking-[-0.04em] text-white md:text-[80px]">
           Selling shouldn&apos;t mean juggling multiple tools.
        </h2>
        <div className="hidden md:block w-px self-stretch bg-white/10 mx-12" />
        <div className="flex-1 flex items-center">
          <p className="text-[16px] text-neutral-400 max-w-sm leading-relaxed">
            You have a product. Then selling becomes a full-time job: research, leads, outreach, meetings, proposals, and pipeline tracking.
          </p>
        </div>
      </div>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

        {/* ── Card 1: Problem ── */}
        <div className="lv2-card group relative flex flex-col overflow-hidden rounded-2xl" style={{ background: "linear-gradient(160deg, #13080d 0%, #0f0a0a 100%)" }}>
          {/* Subtle red glow */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 20%, rgba(239,68,68,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
          {/* Label pill */}
          <div className="relative z-10 p-6 pb-0">
            <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-400">
              Problem
            </span>
          </div>
          {/* Visual mockup */}
          <div className="relative z-10 mx-6 mt-5 overflow-hidden rounded-xl p-4" style={{ background: "#0c080b", border: "1px solid rgba(239,68,68,0.12)" }}>
            {/* Fake CRM header */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500/60" />
              <div className="h-2 rounded bg-white/8" style={{ width: 80 }} />
              <div className="ml-auto h-2 rounded bg-white/5" style={{ width: 40 }} />
            </div>
            {/* Fake rows — declining metrics */}
            {[70,45,30,18].map((w,i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-white/5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded bg-white/8" style={{ width: `${w+30}%` }} />
                  <div className="h-1 rounded bg-white/5" style={{ width: `${w}%` }} />
                </div>
                <div className="h-4 rounded-full px-1.5 flex items-center text-[9px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>−{20-i*4}%</div>
              </div>
            ))}
            {/* Loss indicator */}
            <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-[11px] font-bold text-red-400">Pipeline stalled: 0 new replies this week</span>
            </div>
          </div>
          {/* Text */}
          <div className="relative z-10 p-6 pt-5 flex-1">
            <h3 className="text-[22px] font-[800] leading-tight tracking-tight text-white mb-3">
                Manual prospecting slows down progress
            </h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Find your ideal customers, research the market, write personalized outreach, follow up, book meetings, and create proposals — all before the actual selling begins.
            </p>
          </div>
        </div>

        {/* ── Card 2: Challenge ── */}
        <div className="lv2-card group relative flex flex-col overflow-hidden rounded-2xl" style={{ background: "linear-gradient(160deg, #0f0f0a 0%, #0a0a0d 100%)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 60% 30%, rgba(249,115,22,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div className="relative z-10 p-6 pb-0">
            <span className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-400">
              Challenge
            </span>
          </div>
          {/* Visual: scattered tool grid */}
          <div className="relative z-10 mx-6 mt-5 overflow-hidden rounded-xl p-4" style={{ background: "#0a0a0c", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "📊", label: "CRM", sub: "outdated data" },
                { icon: "🔗", label: "LinkedIn", sub: "manual research" },
                { icon: "📧", label: "Email tool", sub: "generic blasts" },
                { icon: "📅", label: "Calendar", sub: "back-and-forth" },
                { icon: "📋", label: "Spreadsheet", sub: "lost leads" },
                { icon: "🗒️", label: "Notion", sub: "no sync" },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 13 }}>{t.icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-300">{t.label}</p>
                    <p className="text-[9px] text-neutral-600">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-neutral-600">← no connection between any of these →</span>
            </div>
          </div>
          {/* Text */}
          <div className="relative z-10 p-6 pt-5 flex-1">
            <h3 className="text-[22px] font-[800] leading-tight tracking-tight text-white mb-3">
                Multiple tools for one conversation
            </h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Your team juggles research, lead databases, email tools, calendars, proposal documents, and CRM views. Context falls through the cracks with every hand-off.
            </p>
          </div>
        </div>

        {/* ── Card 3: Solution ── */}
        <div className="lv2-card group relative flex flex-col overflow-hidden rounded-2xl" style={{ background: "linear-gradient(160deg, #0a0f0a 0%, #080d0a 100%)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 40% 30%, rgba(34,197,94,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div className="relative z-10 p-6 pb-0">
            <span className="inline-flex items-center rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-400">
              Smady Solution
            </span>
          </div>
          {/* Visual: rising dashboard */}
          <div className="relative z-10 mx-6 mt-5 overflow-hidden rounded-xl p-4" style={{ background: "#080d0a", border: "1px solid rgba(34,197,94,0.12)" }}>
            {/* Mini chart header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
                <div className="h-1.5 rounded" style={{ width: 70, background: "rgba(255,255,255,0.1)" }} />
              </div>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>+$1,240</span>
            </div>
            {/* Rising bar chart */}
            <div className="flex items-end gap-1 h-[60px] mb-2">
              {[35,45,55,58,72,82,95].map((h,i) => (
                <div key={i} className="flex-1 rounded-sm" style={{
                  height: `${h}%`,
                  background: i >= 4
                    ? `linear-gradient(to top, rgba(249,115,22,0.9), rgba(249,115,22,0.5))`
                    : `rgba(255,255,255,0.08)`
                }} />
              ))}
            </div>
            {/* Pipeline status row */}
            <div className="flex gap-1.5">
              {["ICP✓","Leads✓","Outreach✓","Meeting✓","Proposal✓"].map(s => (
                <span key={s} className="flex-1 rounded px-1 py-0.5 text-center text-[8px] font-bold" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>{s}</span>
              ))}
            </div>
            {/* Result indicator */}
            <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-[11px] font-bold text-green-400">Context carried into the next step</span>
            </div>
          </div>
          {/* Text */}
          <div className="relative z-10 p-6 pt-5 flex-1">
            <h3 className="text-[22px] font-[800] leading-tight tracking-tight text-white mb-3">
              Smady connects the entire journey
            </h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Your ICP informs your leads. Your leads inform your outreach. Your outreach creates conversations. Meetings inform proposals. Proposals move the pipeline.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      {/* Section header */}
      <div className="text-center mb-14">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400 mb-5 inline-block">
          Pricing is coming soon
        </span>
        <h2 className="text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          The right plan for<br /><span className="lv2-orange-text">your sales journey.</span>
        </h2>
        <p className="mt-4 text-[16px] text-neutral-400 max-w-xl mx-auto">
          We&apos;re shaping pricing around how teams actually sell. While the details are being finalized, here&apos;s what Smady is built to help you do.
        </p>
      </div>
      {/* Coming-soon panel */}
      <div className="lv2-card relative overflow-hidden rounded-3xl p-8 md:p-10" style={{ background: "linear-gradient(135deg, #17100a 0%, #0f0f10 55%, #0a0a0b 100%)", border: "1px solid rgba(249,115,22,0.2)" }}>
        <div className="lv2-glow-orange lv2-parallax absolute -right-24 -top-32" data-lv2-parallax="0.06" style={{ width: 320, height: 320, opacity: 0.18 }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8"><path d="M12 8v4l2.5 2.5"/><circle cx="12" cy="12" r="8.5"/><path d="M4.8 4.8 3 3m16.2 1.8L21 3"/></svg>
          </div>
          <p className="text-[24px] font-[800] tracking-tight text-white">Pricing plans are on the way.</p>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-400">
            We&apos;re making sure every plan reflects real sales workflows—not arbitrary limits. The pricing details will be announced when they&apos;re ready.
          </p>
          <Link
            to="/signup"
            className="lv2-btn-primary mt-7 flex items-center gap-2 rounded-full px-7 py-3 text-[14px] font-semibold text-white"
          >
            Explore Smady
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        <div className="relative z-10 mt-10 grid grid-cols-1 gap-3 border-t border-white/10 pt-8 md:grid-cols-3">
          {[
            { title: "Find the right customers", desc: "Define your ICP and discover leads that fit your product." },
            { title: "Reach them with context", desc: "Create relevant outreach and move interest toward meetings." },
            { title: "Move the deal forward", desc: "Turn conversations into proposals and know what to do next." },
          ].map((benefit, i) => (
            <div key={benefit.title} className="rounded-2xl bg-white/[0.03] p-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-orange-400">0{i + 1}</span>
              <h3 className="mt-3 text-[15px] font-bold text-white">{benefit.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      {/* Heading */}
      <div className="text-center mb-14 lv2-animate" data-delay="0">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400 mb-5 inline-block">
          The Smady Difference
        </span>
        <h2 className="text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          Less Guesswork.<br /><span className="lv2-orange-text">More Selling.</span>
        </h2>
        <p className="mt-4 text-[16px] text-neutral-400 max-w-xl mx-auto">
          Most tools help you do one thing. Smady connects what happens before, during, and after the sale.
        </p>
      </div>
      {/* 3-col comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Problem */}
        <div className="lv2-card lv2-hover-card lv2-animate rounded-2xl p-7" style={{ background: "#0f0f10", '--delay': '0.1s' } as React.CSSProperties} data-delay="0.1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <h3 className="text-[17px] font-[700] text-white mb-3">The disconnected way</h3>
          <ul className="space-y-2.5">
            {["Find your audience from scratch","Research leads in separate tools","Write every message from a blank screen","Chase follow-ups and meeting times","Build proposals without conversation context"].map((t,i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-500">
                <span className="mt-0.5 text-red-500/60">✕</span>{t}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-red-500/10 bg-red-500/5 p-4">
            <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-1">What gets lost</p>
            <p className="text-[20px] font-[900] text-red-400">Time and context</p>
            <p className="text-[11px] text-neutral-600">at every hand-off in the sales journey</p>
          </div>
        </div>

        {/* Challenge icons */}
        <div className="lv2-card lv2-hover-card lv2-animate rounded-2xl p-7" style={{ background: "#0a0a0b", '--delay': '0.2s' } as React.CSSProperties} data-delay="0.2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h3 className="text-[17px] font-[700] text-white mb-3">The Smady difference</h3>
          <div className="grid grid-cols-2 gap-3">
            {[["🎯","Know your customer","Build a clear ICP first"],["🔍","Find better-fit leads","Match prospects to your target"],["✉️","Reach them personally","Relevant outreach at scale"],["📅","Book conversations","Move interest toward meetings"],["📋","Create proposals faster","Turn needs into offers"],["📈","Keep everything connected","Carry context to the pipeline"]].map(([icon,label,sub],i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl bg-white/3 p-3">
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div>
                  <p className="text-[12px] font-semibold text-neutral-300">{label}</p>
                  <p className="text-[10px] text-neutral-600">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solution */}
        <div className="lv2-card lv2-hover-card lv2-animate rounded-2xl p-7" style={{ background: "#0f0f10", '--delay': '0.3s' } as React.CSSProperties} data-delay="0.3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
          </div>
          <h3 className="text-[17px] font-[700] text-white mb-3">The connected way</h3>
          <ul className="space-y-2.5">
            {["Your ICP informs your leads","Your leads inform your outreach","Your outreach creates conversations","Your meetings inform proposals","Your proposals move the pipeline"].map((t,i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-400">
                <span className="mt-0.5 text-orange-400">✓</span>{t}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-orange-500/10 bg-orange-500/5 p-4">
            <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wide mb-1">The result</p>
            <p className="text-[20px] font-[900]" style={{ color: "#f97316" }}>One connected journey</p>
            <p className="text-[11px] text-neutral-600">from finding the right customer to moving the deal forward</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      <div className="text-center mb-14">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400 mb-5 inline-block">
          One Platform. Specialized AI Agents.
        </span>
        <h2 className="text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          Every Step of the Sales Journey,<br /><span className="lv2-orange-text">Connected.</span>
        </h2>
        <p className="mt-4 text-[16px] text-neutral-400 max-w-xl mx-auto">
          Each agent handles a critical part of your sales process while working as part of one connected journey.
        </p>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className="lv2-card lv2-hover-card lv2-animate relative rounded-2xl p-5"
            style={{
              background: i % 2 === 0 ? "#0f0f10" : "#0a0a0b",
              '--delay': `${i * 0.1}s`,
            } as React.CSSProperties}
            data-delay={i * 0.1}
          >
            {/* Step number */}
            <div className="absolute top-4 right-4 text-[11px] font-bold text-neutral-700">0{i + 1}</div>
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 mb-4 text-2xl">
              {s.icon}
            </div>
            <h3 className="text-[15px] font-[700] text-white mb-2">{s.label}</h3>
            <p className="text-[12px] leading-relaxed text-neutral-500">{s.desc}</p>
            {/* Connector dot */}
            {i < STEPS.length - 1 && (
              <div className="hidden md:flex absolute -right-2.5 top-[calc(50%-6px)] z-10 h-5 w-5 items-center justify-center rounded-full border border-orange-500/20 bg-neutral-900">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#f97316" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function OrbitCard() {
  return (
    <div className="relative flex items-center justify-center h-36">
      {/* Rings */}
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="lv2-ring absolute rounded-full border border-orange-500/20"
          style={{
            width: 60 + i * 44,
            height: 60 + i * 44,
            '--d': `${2.5 + i}s`,
          } as React.CSSProperties}
        />
      ))}
      {/* Center */}
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg,#1a0f05,#2d1708)", border: "1px solid rgba(249,115,22,0.4)" }}>
        <Logo iconOnly />
      </div>
    </div>
  );
}

function MetricsSection() {
  const metrics = [
    { val: "01", label: "Know your customer", sub: "Build a clear ICP before prospecting" },
    { val: "02", label: "Find better-fit leads", sub: "Discover prospects that match your target" },
    { val: "03", label: "Reach them personally", sub: "Generate relevant outreach at scale" },
    { val: "04", label: "Book more conversations", sub: "Move prospects from interest to meetings" },
    { val: "05", label: "Create proposals faster", sub: "Turn customer needs into relevant offers" },
    { val: "06", label: "Keep everything connected", sub: "Carry context through the pipeline" },
  ];
  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-16">
      <div className="lv2-card rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0f0f10 0%,#0a0a0b 100%)" }}>
        {/* Orange glow top-left */}
        <div className="lv2-glow-orange lv2-parallax absolute -top-20 -left-20" data-lv2-parallax="0.05" style={{ width: 300, height: 300, opacity: 0.2 }} />
        <div className="grid grid-cols-2 divide-x divide-white/5 md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((m, i) => (
            <div key={i} className="lv2-animate p-8 text-center" data-delay={i * 0.1}>
              <p className="lv2-stat-num text-[44px] font-[900] tracking-tight leading-none mb-2">{m.val}</p>
              <p className="text-[14px] font-semibold text-white mb-1">{m.label}</p>
              <p className="text-[12px] text-neutral-600">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="lv2-section-reveal relative z-10 mx-auto max-w-screen-xl px-6 py-24 text-center">
      <div className="lv2-glow-orange absolute inset-0 mx-auto" style={{ width: 600, height: 400, top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.15 }} />
      <div className="relative">
        <h2 className="text-[48px] font-[900] leading-tight tracking-[-0.04em] text-white md:text-[64px]">
          You Bring the Product.<br /><span className="lv2-orange-text">Smady Brings the Sales Journey.</span>
        </h2>
        <p className="mt-5 text-[17px] text-neutral-400 max-w-lg mx-auto">
          From finding the right customer to moving the right deal forward — let AI handle the busywork while your team focuses on selling.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/signup"
            className="lv2-btn-primary flex items-center gap-2 rounded-full px-8 py-3.5 text-[15px] font-semibold text-white"
          >
            Start Free — No Credit Card
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-[15px] font-medium text-neutral-300 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:text-white"
          >
            Sign In
          </Link>
        </div>
        <p className="mt-5 text-[12px] text-neutral-600">
          ✓ Free tier available &nbsp;·&nbsp; ✓ No setup required &nbsp;·&nbsp; ✓ Live in under 10 minutes
        </p>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Platform", links: ["ICP Engine","Lead Sourcing","Outreach","Meetings","Proposals","Dashboard"] },
    { title: "Solutions", links: ["For Founders","For Sales Teams","For Agencies","For RevOps","Enterprise"] },
    { title: "Company", links: ["About","Blog","Careers","Press","Partners"] },
    { title: "Support", links: ["Documentation","API Reference","Status","Contact","Privacy","Terms"] },
  ];
  return (
    <footer className="lv2-section-reveal relative z-10 border-t border-white/5" style={{ background: "#060606" }}>
      <div className="mx-auto max-w-screen-xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Logo dark />
            </div>
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-5">
              Tell Smady what you&apos;re building. Let AI help you figure out who to sell to, how to reach them, and what to do next.
            </p>
            <div className="flex gap-3">
              {["twitter","github","linkedin"].map(s => (
                <a key={s} href="#" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-500 transition-colors hover:text-white hover:border-orange-500/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                </a>
              ))}
            </div>
          </div>
          {/* Link cols */}
          {cols.map(c => (
            <div key={c.title}>
              <p className="text-[12px] font-bold uppercase tracking-wider text-neutral-500 mb-4">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-[13px] text-neutral-500 transition-colors hover:text-white">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-white/5 pt-8">
          <p className="text-[12px] text-neutral-700">© 2026 Smady AI Ltd. All rights reserved.</p>
          <p className="text-[12px] text-neutral-700">Built for the teams who close.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main export ─────────────────────────────────────────── */

export default function LandingV2() {
  const rootRef = useRef<HTMLDivElement>(null);

  /* Inject style */
  useEffect(() => {
    const existing = document.getElementById("lv2-css");
    if (existing) return;
    const el = document.createElement("style");
    el.id = "lv2-css";
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.getElementById("lv2-css")?.remove(); };
  }, []);

  /* Scroll reveal with staggered delays, scoped to this landing page. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const els = root.querySelectorAll(".lv2-animate, .lv2-section-reveal");
    const timers: number[] = [];
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const delay = Number((e.target as HTMLElement).dataset.delay ?? 0) * 1000;
            timers.push(window.setTimeout(() => e.target.classList.add("visible"), delay));
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach(el => obs.observe(el));
    return () => {
      obs.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, []);

  /* Scroll-linked ambient depth. Direct style writes avoid React renders while scrolling. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const progressBar = root.querySelector<HTMLElement>("[data-lv2-progress-bar]");
    const parallaxNodes: HTMLElement[] = Array.from(
      root.querySelectorAll("[data-lv2-parallax]")
    ) as HTMLElement[];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const updateScrollVisuals = () => {
      frame = 0;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = documentHeight > 0
        ? Math.min(1, Math.max(0, window.scrollY / documentHeight))
        : 0;

      progressBar?.style.setProperty("transform", `scaleX(${progress})`);
      if (reduceMotion) return;

      const viewportCenter = window.innerHeight / 2;
      parallaxNodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const distanceFromCenter = (rect.top + rect.height / 2 - viewportCenter) / window.innerHeight;
        const speed = Number(node.dataset.lv2Parallax ?? 0.08);
        node.style.setProperty("--lv2-parallax-y", `${distanceFromCenter * speed * -80}px`);
      });
    };

    const requestScrollUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollVisuals);
    };

    updateScrollVisuals();
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="lv2-root relative overflow-x-hidden" ref={rootRef}>
      <ScrollProgress />
      <NavBar />
      <HeroSection />
      <BentoGrid />
      <ProductJourney />
      <ProblemSection />
      <ComparisonSection />
      <HowItWorks />
      <PricingSection />
      <MetricsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

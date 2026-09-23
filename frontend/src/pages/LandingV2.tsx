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

  /* Marquee animations */
  @keyframes marquee-ltr {
    from { transform: translateX(-50%); }
    to   { transform: translateX(0%); }
  }
  @keyframes marquee-rtl {
    from { transform: translateX(0%); }
    to   { transform: translateX(-50%); }
  }
  .lv2-marquee-ltr { animation: marquee-ltr 32s linear infinite; }
  .lv2-marquee-rtl { animation: marquee-rtl 28s linear infinite; }

  /* Fade-slide-in on scroll */
  @keyframes fadeSlideIn {
    from { opacity: 0; filter: blur(8px); transform: translateY(30px); }
    to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
  }
  .lv2-animate { opacity: 0; }
  .lv2-animate.visible { animation: fadeSlideIn 0.7s cubic-bezier(.22,1,.36,1) forwards; }

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
    .lv2-hero-h1 { font-size: 46px !important; line-height: 1.05 !important; }

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

    /* MARQUEE: narrower cards so they don't overflow 390px */
    .lv2-testi-card { width: 300px !important; min-width: 300px !important; }

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
`;


/* ─── Data ────────────────────────────────────────────────── */

const TESTIMONIALS = [
  { name: "Arun S.", role: "VP Sales, SaaS company", text: "Smady sources 200+ qualified leads every week without us lifting a finger. Our pipeline has never been this full.", avatar: "AS" },
  { name: "Priya M.", role: "Founder, B2B Startup", text: "The AI writes emails that feel genuinely personalised. Reply rates jumped from 2% to 14% in the first month.", avatar: "PM" },
  { name: "Jake L.", role: "Head of Growth, Fintech", text: "We cut our SDR overhead by 60%. Smady handles prospecting, outreach, and meeting booking autonomously.", avatar: "JL" },
  { name: "Nadia R.", role: "RevOps Lead", text: "The proposal agent is incredible. It reviews against guardrails, sends clean proposals, and never goes off-catalog.", avatar: "NR" },
  { name: "Carlos V.", role: "CEO, Agency", text: "Meetings booked by the AI agent are better prepared — Fireflies transcripts feed directly into the proposal draft.", avatar: "CV" },
  { name: "Sofia K.", role: "Sales Manager", text: "I spend my day closing, not prospecting. Smady fills my calendar with qualified discovery calls every single week.", avatar: "SK" },
];

const T2 = [
  { name: "Hamid T.", role: "Demand Gen, E-commerce", text: "We launched our first outreach campaign in under 10 minutes. 340 leads, 22 replies, 6 meetings — same week.", avatar: "HT" },
  { name: "Emily C.", role: "GTM Lead, SaaS", text: "The ICP engine nailed our buyer persona better than our own research. It defined segments we'd never even considered.", avatar: "EC" },
  { name: "Rohan D.", role: "Co-founder, B2B Platform", text: "No more copy-pasting lead data across 5 tools. Smady is the single source of truth for our entire outbound motion.", avatar: "RD" },
  { name: "Amara N.", role: "Business Dev, Consulting", text: "Smady's meeting agent auto-books qualified calls from email replies. I wake up to a full calendar every morning.", avatar: "AN" },
  { name: "Leo P.", role: "Enterprise AE", text: "The proposal guard-rails caught 3 pricing errors before sending. That alone saved a deal worth $18K.", avatar: "LP" },
  { name: "Zara W.", role: "Growth Hacker", text: "Smady feels like hiring 4 SDRs at a fraction of the cost. Seriously — ICP, leads, outreach, meetings, proposals. Done.", avatar: "ZW" },
];

const STEPS = [
  { icon: "🎯", label: "Define ICP", desc: "AI builds your ideal customer profile from your product description — industries, roles, pain points, company size." },
  { icon: "🔍", label: "Source Leads", desc: "Smady sources 200+ verified, scored leads per week that match your ICP across 40+ data signals." },
  { icon: "✉️", label: "Run Outreach", desc: "AI writes and sends hyper-personalised email sequences. Reply classification routes hot leads instantly." },
  { icon: "📅", label: "Book Meetings", desc: "The scheduling agent reads replies, proposes slots, and books meetings into your calendar automatically." },
  { icon: "📋", label: "Send Proposals", desc: "AI drafts proposals constrained to your pricing catalog, reviewed by guardrails and a risk-checker before sending." },
];

const BARS = [88, 92, 95, 97, 96, 98, 97];
const BAR_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/* ─── Sub-components ─────────────────────────────────────── */

function NavBar() {
  return (
    <nav className="lv2-nav sticky top-0 z-50 flex items-center justify-between px-6 py-4 max-w-screen-xl mx-auto" style={{ position: "sticky", top: 0, zIndex: 50 }}>
      {/* Logo */}
      <div style={{ filter: "brightness(1.1)" }}>
        <Logo />
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
    <section className="relative z-10 px-6 pt-20 pb-8 text-center max-w-screen-xl mx-auto">
      {/* Glow */}
      <div className="lv2-glow-orange" style={{ width: 600, height: 600, top: -200, left: "50%", transform: "translateX(-50%)" }} />
      {/* Pill */}
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-md">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>New</span>
        <span className="text-[13px] font-medium text-neutral-300">Autonomous AI Outbound Platform</span>
        <span className="lv2-orange-text text-[14px]">✦</span>
      </div>
      {/* Headline */}
      <h1 className="lv2-hero-h1 mx-auto max-w-4xl text-[56px] font-[900] leading-[1.02] tracking-[-0.04em] text-white md:text-[72px] lg:text-[80px]">
        Your Next Customer<br />
        <span className="lv2-orange-text">Is One AI Call Away.</span>
      </h1>
      {/* Sub */}
      <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-neutral-400 md:text-[18px]">
        Smady runs your entire outbound machine — ICP research, lead sourcing, personalised outreach, meeting scheduling, and proposal drafting — autonomously, 24/7.
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
    <section className="relative z-10 mx-auto max-w-screen-xl px-6 pb-6">
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
          <div className="lv2-glow-orange" style={{ width: 500, height: 500, bottom: -180, left: -100, opacity: 0.3 }} />

          {/* Top bar — app chrome */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: "#f97316" }} />
              <span className="text-[12px] font-semibold tracking-tight text-neutral-300">Live Leads — Active Sourcing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-bold text-orange-400">247 this week</span>
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
                {[["247","Sourced"],["23","Qualified"],["4","Meetings"]].map(([n,l]) => (
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
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-black bg-neutral-800 text-[9px] font-bold text-neutral-400">+14</div>
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
          <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Qualified Leads</p>
          <p style={{ fontSize: 58, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: "#fff" }}>
            2,400<span style={{ color: "#f97316" }}>+</span>
          </p>
          <p className="mt-2 text-[13px] text-neutral-500">sourced this quarter</p>
          <div className="mt-4 flex items-center gap-1.5 rounded-full w-fit px-3 py-1.5" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
            <span className="text-[11px] font-bold text-orange-400">Q4 pipeline up 43%</span>
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
          <p className="text-[13px] font-semibold text-white mb-0.5">Delivery Success</p>
          <p className="text-[11px] text-neutral-500 mb-4">Last 30 days · 97.8% SLA</p>
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
              <span className="text-[11px] text-neutral-500">Qualified Leads</span>
            </div>
            <span className="text-[12px] font-bold text-orange-400">↑ 97.8%</span>
          </div>
        </div>

        {/* ── Card 5: Global reach (col 10–12, row 2) ── */}
        <div
          className="lv2-card lv2-hover-card relative overflow-hidden rounded-2xl p-5"
          style={{ gridColumn: "10 / 13", gridRow: "2 / 3", background: "#0d0d0f" }}
        >
          {/* Orange glow top-right */}
          <div className="lv2-glow-orange absolute -top-8 -right-8" style={{ width: 150, height: 150, opacity: 0.25 }} />
          <p className="text-[13px] font-semibold text-white mb-1">Global Reach</p>
          <p className="text-[11px] text-neutral-500 mb-4">Leads across 30+ markets</p>
          <div className="flex flex-col gap-2">
            {[
              { flag: "🇺🇸", name: "United States", count: "840+" },
              { flag: "🇬🇧", name: "United Kingdom", count: "320+" },
              { flag: "🇮🇳", name: "India", count: "290+" },
              { flag: "🇨🇦", name: "Canada", count: "180+" },
              { flag: "🇩🇪", name: "Germany", count: "145+" },
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

function Marquee() {
  const cards1 = [...TESTIMONIALS, ...TESTIMONIALS];
  const cards2 = [...T2, ...T2];
  return (
    <section className="relative z-10 py-16 overflow-hidden">
      {/* Section label */}
      <div className="text-center mb-10">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400">
          Trusted by growth teams worldwide
        </span>
      </div>
      {/* Orange glow right */}
      <div className="lv2-glow-orange absolute top-0 right-0" style={{ width: 400, height: 400, opacity: 0.3 }} />
      {/* Row 1 — LTR */}
      <div className="overflow-hidden">
        <div className="lv2-marquee-ltr flex gap-4 w-max mb-4">
          {cards1.map((c, i) => <TestiCard key={i} {...c} />)}
        </div>
      </div>
      {/* Row 2 — RTL */}
      <div className="overflow-hidden">
        <div className="lv2-marquee-rtl flex gap-4 w-max">
          {cards2.map((c, i) => <TestiCard key={i} {...c} />)}
        </div>
      </div>
    </section>
  );
}

function TestiCard({ name, role, text, avatar }: { name: string; role: string; text: string; avatar: string }) {
  return (
    <article
      className="lv2-card lv2-hover-card flex-shrink-0 rounded-2xl p-5"
      style={{ width: 380, background: "rgba(255,255,255,0.04)", border: "none" }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ background: `hsl(${avatar.charCodeAt(0) * 13 % 360},60%,35%)` }}
        >
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{name}</p>
          <p className="text-[11px] text-neutral-500 truncate">{role}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(i => (
            <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z"/></svg>
          ))}
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-neutral-400">&ldquo;{text}&rdquo;</p>
      <div className="mt-3 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
        <span className="text-[10px] text-neutral-600">Verified customer</span>
      </div>
    </article>
  );
}

function ProblemSection() {
  return (
    <section className="relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      {/* Header row — "The problem." + vertical line + subtitle */}
      <div className="mb-12 flex flex-col gap-4 border-b border-white/[0.06] pb-10 md:flex-row md:items-start md:gap-0">
        <h2 className="flex-1 text-[64px] font-[900] leading-none tracking-[-0.04em] text-white md:text-[80px]">
          The problem.
        </h2>
        <div className="hidden md:block w-px self-stretch bg-white/10 mx-12" />
        <div className="flex-1 flex items-center">
          <p className="text-[16px] text-neutral-400 max-w-sm leading-relaxed">
            How Smady solves what holds every sales team back — manually, every single day.
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
              Manual prospecting kills momentum
            </h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Your team spends 5+ hours a day copy-pasting leads, writing one-by-one emails, and chasing follow-ups. SDRs burn out while the pipeline runs dry.
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
              7 tools for one conversation
            </h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Your team juggles LinkedIn, Clay, Apollo, Calendly, and Notion. Nothing connects. Context falls through the cracks with every hand-off.
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
              <span className="text-[11px] font-bold text-green-400">Pipeline up +340% this quarter</span>
            </div>
          </div>
          {/* Text */}
          <div className="relative z-10 p-6 pt-5 flex-1">
            <h3 className="text-[22px] font-[800] leading-tight tracking-tight text-white mb-3">
              One pipeline. Five agents. Zero manual work.
            </h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Smady connects ICP research, lead sourcing, personalised outreach, meeting booking, and proposal drafting in one autonomous pipeline — running 24/7 while your team closes.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

function PricingSection() {
  const tiers = [
    {
      name: "Starter",
      tagline: "For solo founders and early-stage teams",
      price: "$500–$800",
      period: "/ month",
      highlight: false,
      badge: null,
      validDays: 14,
      features: [
        "Up to 200 leads / week",
        "ICP Engine included",
        "Email outreach sequences",
        "Meeting scheduling agent",
        "Basic proposal templates",
        "Email support",
      ],
      cta: "Start with Starter",
    },
    {
      name: "Growth",
      tagline: "For scaling sales teams ready to dominate",
      price: "$1,200–$2,000",
      period: "/ month",
      highlight: true,
      badge: "Most Popular",
      validDays: 21,
      features: [
        "Up to 500 leads / week",
        "Full ICP Engine + scoring",
        "AI-personalised outreach",
        "Auto meeting + calendar sync",
        "Full proposal agent with guardrails",
        "Priority support + onboarding",
        "Run history & analytics",
      ],
      cta: "Start Growing",
    },
    {
      name: "Enterprise",
      tagline: "Custom pipelines for high-volume teams",
      price: "$3,999–$7,999",
      period: "/ month",
      highlight: false,
      badge: null,
      validDays: 21,
      features: [
        "Unlimited leads",
        "Custom ICP + lead scoring models",
        "Multi-sequence outreach",
        "Dedicated meeting agent",
        "Custom proposal catalog",
        "SLA guarantee",
        "Dedicated engineer + CSM",
        "White-label available",
      ],
      cta: "Contact Us",
    },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      {/* Section header */}
      <div className="text-center mb-14">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400 mb-5 inline-block">
          Transparent Pricing
        </span>
        <h2 className="text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          Pick your pipeline.<br /><span className="lv2-orange-text">Start closing today.</span>
        </h2>
        <p className="mt-4 text-[16px] text-neutral-400 max-w-xl mx-auto">
          All plans include every Smady agent. Price reflects the scale of your outbound motion.
        </p>
      </div>
      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="lv2-card relative flex flex-col overflow-hidden rounded-2xl"
            style={{
              background: tier.highlight
                ? "linear-gradient(160deg, #1a0d05 0%, #130a04 100%)"
                : "#0f0f10",
              ...(tier.highlight ? { border: "1px solid rgba(249,115,22,0.25)" } : {}),
            }}
          >
            {/* Orange top accent for highlight */}
            {tier.highlight && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #f97316, #fb923c, transparent)" }} />
            )}
            {/* Badge */}
            {tier.badge && (
              <div className="absolute top-5 right-5">
                <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" }}>
                  {tier.badge}
                </span>
              </div>
            )}
            <div className="p-6 flex-1">
              {/* Name + tagline */}
              <p className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: tier.highlight ? "#f97316" : "#6b7280" }}>
                {tier.name}
              </p>
              <p className="text-[12px] text-neutral-600 mb-5">{tier.tagline}</p>
              {/* Price */}
              <div className="mb-6">
                <span className="text-[36px] font-[900] leading-none tracking-tight text-white">{tier.price}</span>
                <span className="text-[13px] text-neutral-500 ml-1">{tier.period}</span>
                <p className="mt-1 text-[11px] text-neutral-600">{tier.validDays}-day proposal validity included</p>
              </div>
              {/* Divider */}
              <div className="mb-5 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              {/* Features */}
              <ul className="space-y-2.5">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-neutral-400">
                    <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tier.highlight ? "#f97316" : "#6b7280"} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {/* CTA */}
            <div className="p-6 pt-0">
              <Link
                to="/signup"
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition-all hover:-translate-y-0.5"
                style={tier.highlight ? {
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "#fff",
                  boxShadow: "0 6px 20px rgba(249,115,22,0.3)"
                } : {
                  background: "rgba(255,255,255,0.05)",
                  color: "#d4d4d4",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {tier.cta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
      {/* Bottom note */}
      <p className="mt-8 text-center text-[12px] text-neutral-600">
        All plans billed monthly · Cancel any time · Setup takes under 10 minutes
      </p>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      {/* Heading */}
      <div className="text-center mb-14 lv2-animate" data-delay="0">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400 mb-5 inline-block">
          The Smady Difference
        </span>
        <h2 className="text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          Stop Doing This<br /><span className="lv2-orange-text">Manually.</span>
        </h2>
        <p className="mt-4 text-[16px] text-neutral-400 max-w-xl mx-auto">
          Your team deserves to spend time closing — not prospecting. Smady handles the full funnel, end-to-end, autonomously.
        </p>
      </div>
      {/* 3-col comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Problem */}
        <div className="lv2-card lv2-hover-card lv2-animate rounded-2xl p-7" style={{ background: "#0f0f10", '--delay': '0.1s' } as React.CSSProperties} data-delay="0.1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <h3 className="text-[17px] font-[700] text-white mb-3">The Old Way</h3>
          <ul className="space-y-2.5">
            {["5+ hours/week on manual research","Copy-pasting leads across 8 tools","Generic email blasts with 1% reply rate","SDR team spends 70% on prospecting","Proposal errors cost you real deals"].map((t,i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-500">
                <span className="mt-0.5 text-red-500/60">✕</span>{t}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-red-500/10 bg-red-500/5 p-4">
            <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-1">Pipeline impact</p>
            <p className="text-[28px] font-[900] text-red-400">−$42K</p>
            <p className="text-[11px] text-neutral-600">avg annual opportunity loss per SDR</p>
          </div>
        </div>

        {/* Challenge icons */}
        <div className="lv2-card lv2-hover-card lv2-animate rounded-2xl p-7" style={{ background: "#0a0a0b", '--delay': '0.2s' } as React.CSSProperties} data-delay="0.2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h3 className="text-[17px] font-[700] text-white mb-3">The Challenge</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["🎯","ICP Research","Hours of manual work"],
              ["📊","Lead Scoring","No consistent method"],
              ["✉️","Personalisation","Generic templates"],
              ["📅","Scheduling","Back-and-forth emails"],
              ["📋","Proposals","Off-catalog pricing errors"],
              ["📈","Pipeline Visibility","Siloed tools"],
            ].map(([icon,label,sub],i) => (
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
          <h3 className="text-[17px] font-[700] text-white mb-3">The Smady Way</h3>
          <ul className="space-y-2.5">
            {["ICP engine generates a full buyer profile in seconds","200+ verified leads sourced weekly, scored automatically","AI writes hyper-personalised emails that get 14% replies","Meeting agent books calls from email replies autonomously","Proposal AI drafts, reviews, and sends — within pricing guardrails"].map((t,i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-400">
                <span className="mt-0.5 text-orange-400">✓</span>{t}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-orange-500/10 bg-orange-500/5 p-4">
            <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wide mb-1">Pipeline impact</p>
            <p className="text-[28px] font-[900]" style={{ color: "#f97316" }}>+340%</p>
            <p className="text-[11px] text-neutral-600">avg quarterly pipeline growth</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 mx-auto max-w-screen-xl px-6 py-20">
      <div className="text-center mb-14">
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[12px] font-medium text-neutral-400 mb-5 inline-block">
          Five Steps. Zero Manual Work.
        </span>
        <h2 className="text-[40px] font-[800] leading-tight tracking-[-0.03em] text-white md:text-[52px]">
          Your Outbound Machine,<br /><span className="lv2-orange-text">On Autopilot.</span>
        </h2>
        <p className="mt-4 text-[16px] text-neutral-400 max-w-xl mx-auto">
          Smady connects five AI agents into a single pipeline. You define the target — Smady does everything else.
        </p>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
    { val: "2,400+", label: "Leads sourced", sub: "This quarter alone" },
    { val: "14%", label: "Avg reply rate", sub: "Industry avg is 2–3%" },
    { val: "97.8%", label: "Qualification accuracy", sub: "AI-scored + verified" },
    { val: "6×", label: "Faster than manual", sub: "From ICP to proposal" },
  ];
  return (
    <section className="relative z-10 mx-auto max-w-screen-xl px-6 py-16">
      <div className="lv2-card rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0f0f10 0%,#0a0a0b 100%)" }}>
        {/* Orange glow top-left */}
        <div className="lv2-glow-orange absolute -top-20 -left-20" style={{ width: 300, height: 300, opacity: 0.2 }} />
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
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
    <section className="relative z-10 mx-auto max-w-screen-xl px-6 py-24 text-center">
      <div className="lv2-glow-orange absolute inset-0 mx-auto" style={{ width: 600, height: 400, top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.15 }} />
      <div className="relative">
        <h2 className="text-[48px] font-[900] leading-tight tracking-[-0.04em] text-white md:text-[64px]">
          Ready to Close<br /><span className="lv2-orange-text">More, Faster?</span>
        </h2>
        <p className="mt-5 text-[17px] text-neutral-400 max-w-lg mx-auto">
          Join teams who&apos;ve replaced manual outbound with a 5-agent AI pipeline that runs 24/7. No contracts. No setup fees.
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
    <footer className="relative z-10 border-t border-white/5" style={{ background: "#060606" }}>
      <div className="mx-auto max-w-screen-xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Logo dark />
            </div>
            <p className="text-[13px] text-neutral-500 leading-relaxed mb-5">
              Your next customer is one AI call away. Smady automates the entire outbound motion.
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

  /* Scroll reveal with staggered delays */
  useEffect(() => {
    const els = document.querySelectorAll(".lv2-animate");
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const delay = Number((e.target as HTMLElement).dataset.delay ?? 0) * 1000;
            setTimeout(() => e.target.classList.add("visible"), delay);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lv2-root relative overflow-x-hidden" ref={rootRef}>
      <NavBar />
      <HeroSection />
      <BentoGrid />
      <Marquee />
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

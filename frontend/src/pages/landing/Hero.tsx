import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Users, Mail, TrendingUp, CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/smady/StatCard";
import { AreaChartCard } from "@/components/smady/Charts";
import { leadsGrowth, dashboardStats } from "@/mock/dashboard";
import { MarketingNav } from "@/components/smady/MarketingNav";
import { ButtonPrimary, ButtonDark } from "@/components/smady/Button";

const tickerItems = [
  "Meeting booked with Acme Corp",
  "Lead replied at TechFlow Inc.",
  "Proposal approved for Nimbus Labs",
  "New ICP match: 96% confidence",
  "127 emails sent in the last hour",
  "Demo scheduled with Vertex Systems",
];

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden" style={{ background: "#FFF8F1" }}>
      {/* Blurred atmospheric gradient blobs, behind content */}
      <div className="blob-field">
        <div className="blob blob-orange" style={{ width: 480, height: 480, top: "-140px", right: "-80px" }} />
        <div className="blob blob-yellow" style={{ width: 380, height: 380, top: "60px", left: "-100px" }} />
      </div>

      <div className="relative z-[1]">
        <MarketingNav />

        <div className="mx-auto max-w-7xl px-6 pb-16 pt-16">
          <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-12 lg:items-center lg:gap-x-4">
            {/* Left column — 7/12, massive kinetic headline */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3.5 py-1.5 text-xs font-semibold text-primary-600" data-testid="hero-eyebrow-badge">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                AI Outbound, Fully Automated
              </div>

              <h1
                className="mt-6 font-display font-bold leading-[0.98] tracking-[-0.02em] text-ink"
                style={{ fontSize: "clamp(2.75rem, 6.4vw, 4.75rem)" }}
                data-testid="hero-headline"
              >
                <span className="block">Find Your Next Customer</span>
                <span className="block text-primary-500">
                  While You <span className="highlighter-mark">Sleep.</span>
                </span>
              </h1>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-body">
                Smady turns your product details into a precise ideal customer profile, sources verified leads,
                sends outreach, books meetings, and drafts proposals — all on autopilot, so your team spends
                time closing, not searching.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link to="/signup">
                  <ButtonPrimary data-testid="hero-start-free-button" className="px-8 py-3.5 text-base shadow-[0_12px_32px_-8px_rgba(249,98,44,0.45)]">
                    Start Free
                  </ButtonPrimary>
                </Link>
                <Link to="/signup">
                  <ButtonDark data-testid="hero-book-demo-button" className="px-8 py-3.5 text-base" icon={<ArrowUpRight className="h-4 w-4" strokeWidth={2} />}>
                    Book a Demo
                  </ButtonDark>
                </Link>
              </div>

              <p className="mt-6 text-[13px] text-muted" data-testid="hero-trust-line">
                No credit card required · Live in under 5 minutes
              </p>
            </div>

            {/* Right column — 5/12, pristine 3D browser-frame mockup, overlapping left column */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative lg:col-span-5 lg:-ml-16"
            >
              <div
                className="relative overflow-hidden rounded-[24px] border border-black/80 bg-[#171412] p-3 sm:p-4"
                style={{ boxShadow: "0 25px 80px -20px rgba(23,20,18,0.45), 0 0 0 1px rgba(249,98,44,0.08)" }}
                data-testid="hero-product-preview"
              >
                <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                  <span className="ml-3 rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/40">app.smady.ai/dashboard</span>
                </div>
                <div className="mt-3 rounded-[18px] bg-bg p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Leads Today" value={dashboardStats.leadsToday.value} icon={Users} highlighted sparkline={dashboardStats.leadsToday.sparkline} />
                    <StatCard label="Emails Sent" value={dashboardStats.emailsSent.value} icon={Mail} sparkline={dashboardStats.emailsSent.sparkline} />
                    <StatCard label="Total Leads" value={dashboardStats.totalLeads.value} icon={TrendingUp} sparkline={dashboardStats.totalLeads.sparkline} />
                    <StatCard label="Meetings Booked" value={142} icon={CalendarCheck} sparkline={[90, 98, 105, 112, 120, 133, 142]} />
                  </div>
                  <div className="mt-3 hidden sm:block">
                    <AreaChartCard title="Leads Growth" subtitle="Last 12 months" data={leadsGrowth} annotation={{ label: "+22\u00b7 293 leads/week" }} />
                  </div>
                </div>
              </div>

              {/* Floating micro-cards for depth, replacing the old awkward tilt */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-5 -top-6 z-20 hidden items-center gap-3 rounded-[20px] border border-border bg-white p-4 shadow-[0_20px_50px_rgba(23,20,18,0.18)] sm:flex"
                data-testid="hero-floating-card-meeting"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-4.5 w-4.5 text-success" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">Meeting Auto-Booked</p>
                  <p className="text-[11px] text-muted">with Jordan Blake</p>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                className="absolute -bottom-6 -left-6 z-20 hidden items-center gap-3 rounded-[20px] border border-white/10 bg-[#171412] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:flex"
                data-testid="hero-floating-card-leads"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/20">
                  <TrendingUp className="h-4.5 w-4.5 text-primary-400" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">+293 New Leads</p>
                  <p className="text-[11px] text-white/50">this week</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Tilted kinetic ticker ribbon */}
        <div className="overflow-hidden border-y border-primary-600 bg-primary-500 py-3" style={{ transform: "rotate(-1deg) scale(1.04)" }} data-testid="hero-ticker-ribbon">
          <div className="animate-[marquee_28s_linear_infinite] flex w-max gap-10 whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

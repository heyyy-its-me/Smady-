import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/smady/StatCard";
import { AreaChartCard } from "@/components/smady/Charts";
import { leadsGrowth, dashboardStats } from "@/mock/dashboard";
import { MarketingNav } from "@/components/smady/MarketingNav";
import { EyebrowBadge } from "@/components/smady/Badge";
import { ButtonPrimary, ButtonDark } from "@/components/smady/Button";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pb-32 pt-6" style={{ background: "radial-gradient(circle at 50% 0%, #FFE9DA 0%, #FFD3B0 35%, #FBF7F4 70%)" }}>
      <motion.div
        animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-200/50 blur-3xl"
      />
      <MarketingNav />
      <div className="relative mx-auto mt-16 max-w-4xl px-6 text-center">
        <div className="flex justify-center">
          <EyebrowBadge text="AI That Finds and Books Your Next Customer" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          <span className="text-primary-500">The AI Engine That Finds</span>{" "}
          <span className="text-ink">Your Next Best Customer</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body">
          From building your ideal customer profile to booking the meeting, Smady automates outbound end-to-end — so your team spends time closing, not searching.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/signup">
            <ButtonPrimary data-testid="hero-start-free-button">Start Free</ButtonPrimary>
          </Link>
          <Link to="/signup">
            <ButtonDark data-testid="hero-book-demo-button">Book a Demo</ButtonDark>
          </Link>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto mt-16 max-w-5xl px-4"
      >
        <div className="rounded-2xl bg-surface p-6 shadow-nav" data-testid="hero-product-preview">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Leads Generated Today" value={dashboardStats.leadsToday.value} icon={Users} highlighted sparkline={dashboardStats.leadsToday.sparkline} />
            <StatCard label="Emails Sent" value={dashboardStats.emailsSent.value} icon={Mail} sparkline={dashboardStats.emailsSent.sparkline} />
            <StatCard label="Total Leads" value={dashboardStats.totalLeads.value} icon={TrendingUp} sparkline={dashboardStats.totalLeads.sparkline} />
            <StatCard label="Meetings Booked" value={142} icon={ArrowUpRight} sparkline={[90, 98, 105, 112, 120, 133, 142]} />
          </div>
          <div className="mt-5 hidden sm:block">
            <AreaChartCard title="Leads Growth" subtitle="New leads sourced over the last 12 months" data={leadsGrowth} annotation={{ label: "+22% · Total per week: 293" }} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

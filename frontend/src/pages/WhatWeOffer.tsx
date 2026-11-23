import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  Code2,
  Factory,
  GraduationCap,
  HardHat,
  HeartPulse,
  Landmark,
  MapPin,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Logo } from "@/components/smady/Logo";

const businessIndustries = [
  { name: "Technology & IT", icon: Code2 },
  { name: "Financial Services", icon: Landmark },
  { name: "Professional Services", icon: BriefcaseBusiness },
  { name: "Manufacturing & Industrial", icon: Factory },
  { name: "Construction & Engineering", icon: HardHat },
  { name: "Retail & E-commerce", icon: ShoppingBag },
  { name: "Healthcare Organisations", icon: HeartPulse },
  { name: "Education & Training", icon: GraduationCap },
  { name: "Hospitality & Food Businesses", icon: Utensils },
  { name: "Real Estate Businesses", icon: Building2 },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary-600">{children}</p>;
}

export default function WhatWeOffer() {
  return (
    <div className="min-h-screen bg-bg text-ink" data-testid="what-we-offer-page">
      <header className="border-b border-border/70 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Smady home"><Logo /></Link>
          <nav className="flex items-center gap-3 text-sm font-medium sm:gap-5">
            <Link to="/" className="text-body transition-colors hover:text-ink">Home</Link>
            <Link to="/login" className="text-body transition-colors hover:text-ink">Log in</Link>
            <Link to="/signup" className="rounded-full bg-primary-500 px-4 py-2 text-white transition-colors hover:bg-primary-600">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-white px-6 py-9 shadow-sm sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <Eyebrow>What We Offer</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Find the Right Customers for Your Business</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-body">Smady helps businesses discover relevant prospects and potential customers through AI-powered lead generation, qualification and sales automation.</p>
          </div>
        </section>

        <section aria-labelledby="b2b-heading" className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Business prospects</Eyebrow>
              <h2 id="b2b-heading" className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">B2B – Business Lead Generation</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-body">Discover relevant companies, professionals and business decision-makers across multiple industries.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><BadgeCheck size={15} /> Available</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businessIndustries.map(({ name, icon: Icon }) => (
              <div key={name} className="flex items-center gap-3 border-b border-border/70 px-1 py-3">
                <span className="shrink-0 text-primary-600"><Icon size={18} strokeWidth={1.8} /></span>
                <span className="text-sm font-medium text-ink">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">Industry targeting depends on the selected audience and available prospect data. Results can vary by search.</p>
        </section>

        <section aria-labelledby="b2c-heading" className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Individual customers</Eyebrow>
              <h2 id="b2c-heading" className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">B2C – Consumer Lead Generation</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-body">Identify potential individual customers and relevant consumer opportunities for your business.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><Sparkles size={15} /> In development</span>
          </div>

          <div className="mt-6 grid gap-5 rounded-2xl border border-primary-500/15 bg-gradient-to-br from-primary-500/[0.07] via-white to-amber-50/70 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm"><Building2 size={21} /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Consumer focus</p><h3 className="text-xl font-semibold text-ink">Residential Real Estate</h3></div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-body">Smady is expanding its consumer lead-generation capabilities with a dedicated focus on residential real estate, helping identify potential buyers, sellers and renters.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Residential Property Buyers", "Property Sellers", "Renters"].map((item) => <span key={item} className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-body">{item}</span>)}
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-white/90 p-4 sm:min-w-48">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><MapPin size={14} /> Geographical focus</p>
              <div className="mt-3 flex gap-2"><span className="rounded-full bg-bg px-3 py-1.5 text-sm font-medium">United States</span><span className="rounded-full bg-bg px-3 py-1.5 text-sm font-medium">Canada</span></div>
              <p className="mt-3 text-xs leading-5 text-muted">Individual buyer, seller and renter leads are not available yet.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="maps-heading" className="overflow-hidden rounded-2xl border border-primary-500/20 bg-primary-500/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm"><MapPin size={21} /></span>
            <div>
              <span className="inline-flex rounded-full bg-primary-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-700">Coming in Our Next Update</span>
              <h2 id="maps-heading" className="mt-2 text-lg font-semibold text-ink">Google Maps Integration</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-body">We are expanding Smady’s existing local business discovery through Google Maps, helping businesses discover relevant local companies and service providers. The current Leads workflow already offers Google Maps sourcing; this update will expand that capability.</p>
            </div>
          </div>
          <Link to="/leads" className="mt-5 inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary-700 hover:underline sm:mt-0">Explore lead sourcing <ArrowRight size={16} /></Link>
        </section>
      </main>
    </div>
  );
}

import { ArrowUpRight, Building2, Globe2, Mail, MapPin, Users, BriefcaseBusiness, BadgeCheck, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/smady/Logo";

const actors = [
  {
    name: "Leads Finder — Pipeline Labs",
    kind: "Professional and company contacts",
    classification: "B2B",
    icon: Users,
    summary: "Searches a B2B contact database using role, seniority, industry, company and location filters.",
    data: "Names, job titles, work and personal email when available, LinkedIn URL, phone where available, company profile and address fields.",
    geo: "Country, state/region and city filters; no definitive country list published in the reviewed schema.",
    fit: "Broad B2B prospecting across sectors represented in its company database. Validate each segment with a small run.",
    limit: "Provider advertises $1.50 per 1,000 returned leads and up to 50,000 per run. Coverage and contact completeness are provider claims, not guarantees.",
    url: "https://apify.com/pipelinelabs/leads-finder-with-emails-apollo-lusha-zoominfo",
  },
  {
    name: "Leads Finder — Code Pioneer",
    kind: "Professional and company contacts",
    classification: "B2B",
    icon: BriefcaseBusiness,
    summary: "Targets professionals by job title, seniority, function and location, then narrows companies by industry, keywords, size, revenue or funding.",
    data: "Names, job title, email status/email, personal email, paid-plan mobile, LinkedIn, company firmographics, technologies and address fields.",
    geo: "Region/country/state and city include/exclude filters; examples include US, UK and Amsterdam. Not an exhaustive supported-country list.",
    fit: "B2B company and decision-maker discovery. Industry filters are available; actual yield and fit depend on each search.",
    limit: "Provider advertises $1.50 per 1,000 leads; free-plan runs are capped at 100 and mobile numbers are for paying Apify plan users. Store page shows community-maintained status and mixed user reviews.",
    url: "https://apify.com/code_crafter/leads-finder",
  },
  {
    name: "Google Maps Scraper — Apify",
    kind: "Local business discovery",
    classification: "B2B / B2B2C",
    icon: MapPin,
    summary: "Finds places and organizations listed on Google Maps. These are business prospects; the listing is not an individual consumer looking to buy.",
    data: "Business name, category, address, website, phone, ratings/reviews and other place details. Optional paid enrichment can add named business contacts, titles, emails, phones and company details.",
    geo: "Free-text location or country, state, county, city, postal code and custom areas; international places are searchable, subject to Maps coverage.",
    fit: "Local service providers, storefronts and other discoverable places. B2B2C only when a business sells to consumers; no consumer-intent/person search.",
    limit: "Starts at $1.50 per 1,000 places; some detail, review and lead-enrichment options add charges. Results and contact fields vary; a search URL without location context can be capped at 120 results per term.",
    url: "https://apify.com/compass/crawler-google-places",
  },
];

const sectors = [
  { name: "Technology & software", audience: "Software firms, IT services and technology buyers", fit: "B2B", source: "Professional contact databases", status: "Searchable filters; validate target titles and company yield." },
  { name: "Professional services", audience: "Consultancies, agencies and specialist firms", fit: "B2B", source: "Professional contacts; Maps for local firms", status: "Potential fit; segment relevance depends on query and available records." },
  { name: "Manufacturing & industrial", audience: "Manufacturers, distributors and operations leaders", fit: "B2B", source: "Professional contact databases; Maps for local businesses", status: "Potential fit through company industry/keyword and role filters." },
  { name: "Retail, hospitality & local services", audience: "Businesses serving local communities", fit: "B2B / B2B2C", source: "Google Maps Scraper", status: "Local business discovery; consumer-person leads are not provided." },
  { name: "Healthcare, education & real estate", audience: "Organizations and service providers", fit: "B2B / B2B2C", source: "Professional contacts; Maps for listed organizations", status: "Potential fit only; no vertical-specific validation found in actor documentation." },
];

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-600">{children}</span>;
}

export default function WhatWeOffer() {
  return (
    <div className="space-y-12 pb-10" data-testid="what-we-offer-page">
      <header className="flex items-center justify-between border-b border-border/70 py-4">
        <Link to="/" aria-label="Smady home"><Logo /></Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-body">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <Link to="/login" className="hover:text-primary-600">Log in</Link>
          <Link to="/signup" className="rounded-full bg-primary-500 px-4 py-2 text-white hover:bg-primary-600">Get started</Link>
        </nav>
      </header>
      <section className="relative overflow-hidden rounded-3xl border border-border bg-white p-7 shadow-sm sm:p-10">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <Tag>Lead discovery · qualification · outreach workflow</Tag>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Find the Right Customers for Your Business</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-body">Smady helps teams define an ideal customer profile, discover relevant business prospects and organize follow-up. Available sources focus on professional contacts and local businesses—not individual consumer intent data.</p>
          <div className="mt-7 flex flex-wrap gap-3"><a href="/icp" className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-600">Build your ICP <ArrowUpRight size={16} /></a><a href="/leads" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink hover:bg-muted/40">Explore lead sourcing</a></div>
        </div>
      </section>

      <section>
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary-600">How discovery works</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Our lead generation capabilities</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Actor documentation describes available features. Smady’s visible lead-source selector currently offers LinkedIn and Google Maps through its configured sourcing workflow. We have not verified that all three listed Apify actors are connected to the live workflow.</p></div>
        <div className="grid gap-5 lg:grid-cols-3">
          {actors.map((actor) => { const Icon = actor.icon; return <article key={actor.name} className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-primary-500/10 p-3 text-primary-600"><Icon size={21} /></div><Tag>{actor.classification}</Tag></div>
            <h3 className="mt-4 text-lg font-semibold text-ink">{actor.name}</h3><p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{actor.kind}</p><p className="mt-3 text-sm leading-6 text-body">{actor.summary}</p>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="font-semibold text-ink">Potential fit</dt><dd className="mt-1 leading-5 text-body">{actor.fit}</dd></div><div><dt className="flex items-center gap-2 font-semibold text-ink"><Mail size={14} /> Data fields</dt><dd className="mt-1 leading-5 text-body">{actor.data}</dd></div><div><dt className="flex items-center gap-2 font-semibold text-ink"><Globe2 size={14} /> Geography</dt><dd className="mt-1 leading-5 text-body">{actor.geo}</dd></div><div><dt className="font-semibold text-ink">Pricing and limits</dt><dd className="mt-1 leading-5 text-body">{actor.limit}</dd></div></dl>
            <a className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary-600 hover:underline" href={actor.url} target="_blank" rel="noreferrer">Apify actor details <ArrowUpRight size={14} /></a>
          </article>; })}
        </div>
      </section>

      <section>
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary-600">Audience fit</p><h2 className="mt-2 font-display text-2xl font-semibold text-ink">Industries we can help you explore</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">These are practical starting points based on available company, role, keyword and local-place search fields—not a guarantee that every sub-industry has been tested or will return qualified leads.</p></div>
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"><div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{sectors.map(s => <article key={s.name} className="rounded-xl border border-border/80 bg-bg/50 p-4"><div className="flex items-center gap-2"><Building2 size={17} className="text-primary-600"/><h3 className="font-semibold text-ink">{s.name}</h3></div><p className="mt-3 text-sm text-body">{s.audience}</p><div className="mt-3"><Tag>{s.fit}</Tag></div><p className="mt-3 text-xs leading-5 text-muted"><strong>Source:</strong> {s.source}</p><p className="mt-2 text-xs leading-5 text-muted">{s.status}</p></article>)}</div></div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary-500/10 p-3 text-primary-600"><Workflow size={20}/></div><h2 className="text-lg font-semibold text-ink">Integrations and availability</h2></div><ul className="mt-4 space-y-3 text-sm leading-6 text-body"><li><strong>Lead sourcing:</strong> Smady offers LinkedIn and Google Maps as source choices in the Leads workflow; processing is handled through a configured automation workflow.</li><li><strong>Apify actor catalog:</strong> the three actors documented above are research-backed options. Their individual production routing in Smady is not verified from the application code.</li><li><strong>Google:</strong> Gmail and Calendar connection is available for requested outreach and meeting actions.</li><li><strong>CRM destinations:</strong> no direct CRM integration was verified in the current application.</li></ul></article>
        <article className="rounded-2xl border border-border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary-500/10 p-3 text-primary-600"><BadgeCheck size={20}/></div><h2 className="text-lg font-semibold text-ink">Use data responsibly</h2></div><p className="mt-4 text-sm leading-6 text-body">Contact coverage and accuracy vary by provider, geography and search criteria. Some actor options return personal contact data. You are responsible for having a lawful basis to collect and use personal data and for following applicable privacy, marketing and platform rules. Provider pricing, run limits and add-ons can change; confirm them in Apify before a run.</p></article>
      </section>
    </div>
  );
}

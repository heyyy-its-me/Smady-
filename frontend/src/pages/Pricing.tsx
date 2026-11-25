import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/smady/Logo";

const plans: { id: string; name: string; price: string; period: string; description: string; term: string; recommended?: boolean }[] = [
  { id: "monthly", name: "Monthly Plan", price: "$19", period: "/month", description: "A flexible way to get started.", term: "Monthly subscription after your free trial." },
  { id: "six-month", name: "6-Month Plan", price: "$100", period: "/ 6 months", description: "A steady rhythm for growing teams.", term: "Six-month subscription plan." },
  { id: "yearly", name: "Yearly Plan", price: "$200", period: "/year", description: "The best value for the long run.", term: "Annual subscription plan.", recommended: true },
];

export default function Pricing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-18rem] h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-orange-600/10 blur-[130px]" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="Smady home"><Logo dark /></Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link to="/" className="hidden text-sm text-neutral-400 transition hover:text-white sm:inline">Home</Link>
          <Link to="/login" className="text-sm text-neutral-300 transition hover:text-white">Log in</Link>
          <Link to="/signup" className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400">Sign up</Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.07] px-4 py-1.5 text-xs font-medium text-orange-200"><Sparkles className="h-3.5 w-3.5" /> Straightforward plans, built for sales</span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl md:text-6xl">Simple, Transparent <span className="bg-gradient-to-r from-orange-300 to-orange-500 bg-clip-text text-transparent">Pricing</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">Choose a plan that works for your business. Get started with Smady and simplify your sales process with AI-powered lead generation and automation.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 items-stretch gap-4 md:mt-16 md:grid-cols-3 md:gap-5">
          {plans.map((plan) => (
            <article key={plan.id} data-testid={`pricing-plan-${plan.id}`} className={`relative flex flex-col rounded-3xl border p-6 sm:p-7 ${plan.recommended ? "border-orange-400/45 bg-gradient-to-b from-[#21140e] to-[#101011] shadow-[0_0_45px_rgba(249,115,22,0.09)] md:-my-3 md:py-10" : "border-white/[0.09] bg-gradient-to-b from-[#151516] to-[#0e0e0f]"}`}>
              {plan.recommended && <span className="absolute right-5 top-5 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-200">Recommended</span>}
              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <p className="mt-2 text-sm text-neutral-400">{plan.description}</p>
              <div className="mt-8 flex items-baseline gap-1.5"><span className="text-4xl font-extrabold tracking-tight text-white">{plan.price}</span><span className="text-sm text-neutral-400">{plan.period}</span></div>
              <div className="mt-3 inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-xs font-medium text-emerald-300">One-month free trial</div>
              <p className="mt-5 min-h-10 text-sm leading-6 text-neutral-400">{plan.term}</p>
              <ul className="mt-5 space-y-3 border-t border-white/[0.08] pt-5 text-sm text-neutral-300">
                <li className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />Full month to explore Smady</li>
                <li className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />AI-powered sales tools</li>
                <li className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />{plan.term}</li>
              </ul>
              <Link to={`/signup?plan=${plan.id}`} data-testid={`pricing-buy-now-${plan.id}`} className={`mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${plan.recommended ? "bg-orange-500 text-white hover:bg-orange-400" : "border border-white/15 bg-white/[0.04] text-white hover:border-orange-400/40 hover:bg-orange-400/10"}`}>
                Buy Now <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <section className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-r from-[#1a120d] via-[#121111] to-[#111113] px-6 py-9 text-center sm:px-10 sm:py-11">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Try Smady at your own pace</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Start with One Month Free</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">Explore Smady&apos;s AI-powered sales capabilities with a one-month free trial before choosing a subscription plan.</p>
          <Link to="/signup?plan=monthly" data-testid="pricing-free-trial-cta" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-6 text-sm font-semibold text-white transition hover:bg-orange-400">Start Your Free Trial <ArrowRight className="h-4 w-4" /></Link>
        </section>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-neutral-500">Prices shown are sample figures for this initial design and are not final commercial pricing.</p>
      </section>
      <footer className="border-t border-white/[0.07] px-5 py-6 text-center text-xs text-neutral-500">© {new Date().getFullYear()} Smady · <Link to="/" className="transition hover:text-white">Back to home</Link></footer>
    </main>
  );
}

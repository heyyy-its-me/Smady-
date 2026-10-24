import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/smady/Logo";

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  const contactEmail = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL?.trim();
  const operatorName = import.meta.env.VITE_LEGAL_OPERATOR_NAME?.trim() || "Smady";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Smady home"><Logo dark /></Link>
          <nav className="flex gap-5 text-sm text-neutral-300">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
          </nav>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">{operatorName}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-neutral-400">Effective date: October 24, 2026</p>
        <div className="legal-content mt-10 space-y-8 text-[15px] leading-7 text-neutral-300">{children}</div>
        <section className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-300">
          <h2 className="font-semibold text-white">Contact</h2>
          {contactEmail ? (
            <p className="mt-2">For privacy, account, or terms questions, contact <a className="text-orange-300 underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
          ) : (
            <p className="mt-2 text-amber-200">Before public launch, configure a monitored privacy/support address with the `VITE_PRIVACY_CONTACT_EMAIL` frontend environment variable.</p>
          )}
        </section>
      </article>
      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-neutral-500">
        © 2026 {operatorName}. <Link to="/privacy" className="mx-2 underline">Privacy Policy</Link>
        <Link to="/terms" className="underline">Terms of Service</Link>
      </footer>
      <style>{`.legal-content h2{font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:.5rem}.legal-content p{margin-top:.5rem}.legal-content ul{list-style:disc;padding-left:1.4rem;margin-top:.5rem}.legal-content li{padding:.15rem 0}.legal-content a{color:#fdba74;text-decoration:underline}`}</style>
    </main>
  );
}

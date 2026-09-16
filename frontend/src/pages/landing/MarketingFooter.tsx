import { Link } from "react-router-dom";
import { Twitter, Linkedin } from "lucide-react";
import { Logo } from "@/components/smady/Logo";

const columns = [
  { title: "Product", links: ["ICP Engine", "Lead Management", "Outreach", "Meeting Scheduler", "Proposals", "Reports"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
];

export function MarketingFooter() {
  return (
    <footer style={{ background: "#171412" }} data-testid="marketing-footer">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo dark />
            <p className="mt-4 text-sm text-white/50">AI outbound, fully automated.</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{col.title}</p>
              <div className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <Link key={l} to="/" className="block text-sm text-white/60 hover:text-white">
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/40">© 2026 Smady. All rights reserved.</p>
          <div className="flex gap-4 text-white/40">
            <Twitter className="h-4 w-4" strokeWidth={1.5} />
            <Linkedin className="h-4 w-4" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </footer>
  );
}

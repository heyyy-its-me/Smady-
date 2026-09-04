import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github } from "lucide-react";
import { Logo } from "@/components/smady/Logo";

const columns = [
  { title: "Product", links: ["ICP", "Leads", "Outreach", "Meetings", "Proposals", "Reports"] },
  { title: "Company", links: ["About", "Blog", "Careers"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
];

export function MarketingFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-6 py-16" data-testid="marketing-footer">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-body">AI that finds and books your next customer.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{col.title}</p>
            <div className="mt-4 space-y-2">
              {col.links.map((l) => (
                <Link key={l} to="/" className="block text-sm text-body hover:text-ink">
                  {l}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
        <p className="text-xs text-muted">© 2026 Smady. All rights reserved.</p>
        <div className="flex gap-4 text-muted">
          <Twitter className="h-4 w-4" strokeWidth={1.5} />
          <Linkedin className="h-4 w-4" strokeWidth={1.5} />
          <Github className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>
    </footer>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ButtonPrimary } from "./Button";

const marketingLinks = [
  { label: "Home", href: "#home" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-4 z-40 mx-auto max-w-6xl px-4">
      <motion.header
        className={cn("flex items-center justify-between rounded-full bg-white px-4 shadow-nav transition-all", scrolled ? "py-1.5" : "py-2.5")}
        data-testid="marketing-pill-nav"
      >
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {marketingLinks.map((l) => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-body hover:text-ink" data-testid={`marketing-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:block">
          <Link to="/signup">
            <ButtonPrimary data-testid="nav-book-demo-button">Book a Demo</ButtonPrimary>
          </Link>
        </div>
        <button className="rounded-full p-2 text-ink lg:hidden" onClick={() => setOpen((o) => !o)} data-testid="marketing-mobile-menu-toggle">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </motion.header>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-2xl bg-white p-4 shadow-nav lg:hidden"
          >
            {marketingLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                data-testid={`marketing-mobile-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="block py-2 text-sm font-medium text-body"
              >
                {l.label}
              </a>
            ))}
            <Link to="/signup" onClick={() => setOpen(false)}>
              <ButtonPrimary className="mt-2 w-full">Book a Demo</ButtonPrimary>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

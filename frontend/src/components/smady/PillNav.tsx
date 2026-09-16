import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bell, ChevronDown, Menu, X } from "lucide-react";
import { cn, slug } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "./Logo";
import { AvatarInitial } from "./AvatarStack";

const appNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "ICP Engine", path: "/icp" },
  { label: "Leads", path: "/leads" },
  { label: "Outreach", path: "/outreach" },
  { label: "Meetings", path: "/meetings" },
  { label: "Proposals", path: "/proposals" },
  { label: "Reports", path: "/reports" },
];

export function AppPillNav() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-4 z-40 mx-auto max-w-7xl px-4">
      <motion.header
        className={cn("flex items-center justify-between rounded-full bg-white px-3 shadow-nav transition-all", scrolled ? "py-1.5" : "py-2.5")}
        data-testid="app-pill-nav"
      >
        <Link to="/dashboard" className="flex items-center gap-2 pl-2">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {appNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-link-${slug(item.label)}`}
                className={cn("rounded-full px-4 py-2 text-sm font-medium transition-colors", active ? "bg-primary-500 text-white" : "text-body hover:text-ink")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pr-1">
          <button className="relative rounded-full p-2 text-body hover:bg-bg" data-testid="nav-mail-icon">
            <Mail className="h-5 w-5" strokeWidth={1.5} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-semibold text-white">3</span>
          </button>
          <button className="relative rounded-full p-2 text-body hover:bg-bg" data-testid="nav-bell-icon">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary-500" />
          </button>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="relative">
            <button onClick={() => setProfileOpen((o) => !o)} data-testid="nav-profile-dropdown-toggle" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-bg">
              <AvatarInitial name={user?.name || "Alex Morgan"} size={32} />
              <span className="hidden text-sm font-medium text-ink sm:inline">{user?.name || "Alex Morgan"}</span>
              <ChevronDown className="h-4 w-4 text-muted" strokeWidth={1.5} />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 w-44 rounded-2xl bg-white p-2 shadow-nav"
                  data-testid="nav-profile-dropdown-menu"
                >
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-bg" data-testid="nav-profile-link">Profile</button>
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-bg" data-testid="nav-settings-link">Settings</button>
                  <button onClick={logout} data-testid="nav-logout-button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-bg">
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="rounded-full p-2 text-ink lg:hidden" onClick={() => setMobileOpen((o) => !o)} data-testid="app-mobile-menu-toggle">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.header>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-2xl bg-white p-3 shadow-nav lg:hidden"
          >
            {appNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                data-testid={`mobile-nav-link-${slug(item.label)}`}
                className={cn("block rounded-lg px-3 py-2 text-sm font-medium", location.pathname === item.path ? "bg-primary-500 text-white" : "text-body")}
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

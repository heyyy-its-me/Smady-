import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bell, ChevronDown, Menu, X, Calendar, FileText } from "lucide-react";
import { cn, slug } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
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
  // Frosted glass dropdown nav - cache bust
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { meetings = [], proposals = [], reviewQueue = [] } = useAppData();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const upcomingMeetings = meetings.filter(m => new Date(m.meeting_date) > new Date());
  const pendingProposals = reviewQueue.filter(p => p.final_status === "Needs Review" || p.final_status === "needs_review");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMailOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sticky top-4 z-40 mx-auto max-w-7xl px-4" ref={containerRef}>
      <motion.header
        className={cn(
          "flex items-center justify-between rounded-full backdrop-blur-2xl border px-5 transition-all",
          scrolled ? "py-2" : "py-3"
        )}
        style={{
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.12) 100%)`,
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          borderColor: "rgba(255, 255, 255, 0.5)",
          boxShadow:
            "0 8px 32px 0 rgba(0, 0, 0, 0.18)," +
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.8)," +
            "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)," +
            "0 0 0 1px rgba(255, 255, 255, 0.2)",
        }}
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
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  active
                    ? "text-primary-500 relative font-semibold"
                    : "text-body hover:text-ink hover:bg-white/10"
                )}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, rgba(249, 98, 44, 0.18) 0%, rgba(249, 98, 44, 0.08) 100%)`,
                        boxShadow:
                          "0 0 32px rgba(249, 98, 44, 0.4)," +
                          "inset 0 0 24px rgba(249, 98, 44, 0.25)," +
                          "inset 0 1px 2px rgba(255, 255, 255, 0.3)," +
                          "inset 0 -1px 1px rgba(0, 0, 0, 0.15)",
                        border: "1px solid rgba(249, 98, 44, 0.5)",
                        backdropFilter: "blur(8px)",
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pr-1">
          <div className="relative">
            <button onClick={() => { setMailOpen(!mailOpen); setNotificationsOpen(false); }} className="relative rounded-full p-2 text-body hover:bg-white/10 transition-colors" data-testid="nav-mail-icon">
              <Mail className="h-5 w-5" strokeWidth={1.5} />
              {pendingProposals.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-semibold text-white">{pendingProposals.length}</span>
              )}
            </button>
            <AnimatePresence>
              {mailOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 w-80 max-h-96 rounded-2xl backdrop-blur-2xl border p-2 overflow-y-auto"
                  style={{
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.12) 100%)`,
                    backdropFilter: "blur(32px) saturate(200%)",
                    WebkitBackdropFilter: "blur(32px) saturate(200%)",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    boxShadow:
                      "0 8px 32px 0 rgba(0, 0, 0, 0.18)," +
                      "inset 0 1px 0 0 rgba(255, 255, 255, 0.8)," +
                      "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)," +
                      "0 0 0 1px rgba(255, 255, 255, 0.2)",
                  }}
                  data-testid="nav-mail-dropdown"
                >
                  <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Pending Proposals ({pendingProposals.length})</div>
                  {pendingProposals.length > 0 ? (
                    pendingProposals.map(p => (
                      <div key={p.id} className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors text-sm">
                        <FileText className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink truncate">{p.lead_name || "Proposal"}</p>
                          <p className="text-xs text-muted truncate">{p.lead_email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted">No pending proposals</div>
                  )}
                  <Link to="/proposals" onClick={() => setMailOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-primary-500 hover:bg-white/20 transition-colors font-medium mt-2 border-t border-white/10">
                    View All Proposals
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button onClick={() => { setNotificationsOpen(!notificationsOpen); setMailOpen(false); }} className="relative rounded-full p-2 text-body hover:bg-white/10 transition-colors" data-testid="nav-bell-icon">
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              {upcomingMeetings.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-500" />
              )}
            </button>
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 w-80 max-h-96 rounded-2xl backdrop-blur-2xl border p-2 overflow-y-auto"
                  style={{
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.12) 100%)`,
                    backdropFilter: "blur(32px) saturate(200%)",
                    WebkitBackdropFilter: "blur(32px) saturate(200%)",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    boxShadow:
                      "0 8px 32px 0 rgba(0, 0, 0, 0.18)," +
                      "inset 0 1px 0 0 rgba(255, 255, 255, 0.8)," +
                      "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)," +
                      "0 0 0 1px rgba(255, 255, 255, 0.2)",
                  }}
                  data-testid="nav-notifications-dropdown"
                >
                  <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Upcoming Meetings ({upcomingMeetings.length})</div>
                  {upcomingMeetings.length > 0 ? (
                    upcomingMeetings.map(m => (
                      <div key={m.id} className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors text-sm">
                        <Calendar className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink truncate">{m.lead_name}</p>
                          <p className="text-xs text-muted truncate">{new Date(m.meeting_date).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted">No upcoming meetings</div>
                  )}
                  <Link to="/meetings" onClick={() => setNotificationsOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-primary-500 hover:bg-white/20 transition-colors font-medium mt-2 border-t border-white/10">
                    View All Meetings
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="hidden h-6 w-px bg-border/30 sm:block" />
          <div className="relative">
            <button onClick={() => setProfileOpen((o) => !o)} data-testid="nav-profile-dropdown-toggle" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-white/10 transition-colors">
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
                  className="absolute right-0 top-12 w-44 rounded-2xl backdrop-blur-2xl border p-2"
                  style={{
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.12) 100%)`,
                    backdropFilter: "blur(32px) saturate(200%)",
                    WebkitBackdropFilter: "blur(32px) saturate(200%)",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    boxShadow:
                      "0 8px 32px 0 rgba(0, 0, 0, 0.18)," +
                      "inset 0 1px 0 0 rgba(255, 255, 255, 0.8)," +
                      "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)," +
                      "0 0 0 1px rgba(255, 255, 255, 0.2)",
                  }}
                  data-testid="nav-profile-dropdown-menu"
                >
                  <Link to="/profile" onClick={() => setProfileOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-white/20 transition-colors" data-testid="nav-profile-link">Profile</Link>
                  <button onClick={logout} data-testid="nav-logout-button" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-white/20 transition-colors">
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="rounded-full p-2 text-ink hover:bg-white/10 transition-colors lg:hidden" onClick={() => setMobileOpen((o) => !o)} data-testid="app-mobile-menu-toggle">
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
            className="mt-2 overflow-hidden rounded-2xl backdrop-blur-2xl border p-3 lg:hidden"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.12) 100%)`,
              backdropFilter: "blur(32px) saturate(200%)",
              WebkitBackdropFilter: "blur(32px) saturate(200%)",
              borderColor: "rgba(255, 255, 255, 0.5)",
              boxShadow:
                "0 8px 32px 0 rgba(0, 0, 0, 0.18)," +
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.8)," +
                "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)," +
                "0 0 0 1px rgba(255, 255, 255, 0.2)",
            }}
          >
            {appNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { setMobileOpen(false); setMailOpen(false); setNotificationsOpen(false); }}
                data-testid={`mobile-nav-link-${slug(item.label)}`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                  location.pathname === item.path
                    ? "text-primary-500 font-semibold"
                    : "text-body hover:text-ink"
                )}
                style={
                  location.pathname === item.path
                    ? {
                        background: `linear-gradient(135deg, rgba(249, 98, 44, 0.15) 0%, rgba(249, 98, 44, 0.08) 100%)`,
                        boxShadow:
                          "0 0 24px rgba(249, 98, 44, 0.35)," +
                          "inset 0 0 16px rgba(249, 98, 44, 0.2)," +
                          "inset 0 1px 1px rgba(255, 255, 255, 0.2)",
                        border: "1px solid rgba(249, 98, 44, 0.4)",
                      }
                    : undefined
                }
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

import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/smady/Logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link to="/" className="mb-10 inline-block">
          <Logo />
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          {children}
        </motion.div>
      </div>
      <div className="relative hidden overflow-hidden lg:block" style={{ background: "radial-gradient(circle at 50% 0%, #FFE9DA 0%, #FFD3B0 35%, #FBF7F4 70%)" }}>
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-10 top-24 h-64 w-64 rounded-full bg-primary-200/40 blur-3xl"
        />
        <div className="relative flex h-full flex-col items-center justify-center gap-6 p-12">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Meetings Booked</p>
            <p className="mt-1 text-3xl font-bold text-ink">142</p>
            <p className="mt-2 text-sm text-success">+18% this month</p>
          </div>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <div className="flex items-center gap-2 text-primary-500">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Testimonial</span>
            </div>
            <p className="mt-3 text-sm text-body">"Smady books more demos in a week than our SDR team did in a month."</p>
            <p className="mt-2 text-xs font-semibold text-ink">— Head of Sales, Northwind Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}

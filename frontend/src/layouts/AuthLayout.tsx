import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Logo } from "@/components/smady/Logo";

export function AuthLayout({ children, rightPanel }: { children: React.ReactNode; rightPanel?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[55fr_45fr]" style={{ background: "#FFFFFF" }}>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link to="/" className="mb-10 inline-block">
          <Logo />
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          {children}
        </motion.div>
      </div>
      <div className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 30% 20%, #FFC94A 0%, #F9622C 55%, #E24D1B 100%)" }}
        />
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 80% 80%, #FFC94A 0%, transparent 60%)" }} />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-16 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -16, 0], y: [0, 18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative z-[1] w-full max-w-sm rounded-3xl bg-white p-7" style={{ boxShadow: "0 20px 60px -20px rgba(23,20,18,0.35)" }} data-testid="auth-right-panel-card">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

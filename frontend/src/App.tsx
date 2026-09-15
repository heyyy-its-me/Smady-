import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppDataContext";
import { AppShell } from "@/layouts/AppShell";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import LandingV2 from "@/pages/LandingV2";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import ICPEngine from "@/pages/ICPEngine";
import Leads from "@/pages/Leads";
import Outreach from "@/pages/Outreach";
import Meetings from "@/pages/Meetings";
import Proposals from "@/pages/Proposals";
import Reports from "@/pages/Reports";

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/preview" element={<LandingV2 />} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/icp" element={<PageTransition><ICPEngine /></PageTransition>} />
          <Route path="/leads" element={<PageTransition><Leads /></PageTransition>} />
          <Route path="/outreach" element={<PageTransition><Outreach /></PageTransition>} />
          <Route path="/meetings" element={<PageTransition><Meetings /></PageTransition>} />
          <Route path="/proposals" element={<PageTransition><Proposals /></PageTransition>} />
          <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <BrowserRouter>
          <AnimatedRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AppDataProvider>
    </AuthProvider>
  );
}

export default App;

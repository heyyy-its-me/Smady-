import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { Logo } from "@/components/smady/Logo";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

const CSS = `
  .fp-root {
    font-family: 'Inter', sans-serif;
    background: #080808;
    color: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .fp-root::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 64px 64px;
    z-index: 0;
  }
  .fp-input {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: #fff !important;
    border-radius: 10px !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
  }
  .fp-input:focus {
    border-color: rgba(249,115,22,0.5) !important;
    box-shadow: 0 0 0 3px rgba(249,115,22,0.1) !important;
    outline: none !important;
  }
  .fp-input::placeholder { color: rgba(255,255,255,0.2) !important; }
  .fp-btn {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
    color: #fff !important;
    border: none !important;
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
  }
  .fp-btn:hover:not(:disabled) {
    transform: translateY(-1px) !important;
    box-shadow: 0 8px 24px rgba(249,115,22,0.35) !important;
  }
  .fp-btn:disabled { opacity: 0.6 !important; }
  @keyframes fp-lock {
    0%,100% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
  }
  .fp-lock-anim { animation: fp-lock 2s ease-in-out infinite; }
  @keyframes fp-shoot {
    0% { transform: translateX(-8px) translateY(4px); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translateX(60px) translateY(-30px); opacity: 0; }
  }
  .fp-shoot { animation: fp-shoot 1.5s ease-out forwards; }
  @keyframes fp-bounce-in {
    0% { transform: scale(0.8); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  .fp-bounce-in { animation: fp-bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [showShoot, setShowShoot] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const emailVal = watch("email") ?? "";

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSentEmail(data.email);
      setShowShoot(true);
      setTimeout(() => { setSent(true); setShowShoot(false); }, 1200);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Inject CSS
  if (typeof document !== "undefined" && !document.getElementById("fp-css")) {
    const el = document.createElement("style");
    el.id = "fp-css";
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  return (
    <div className="fp-root relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Orange radial glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl"
        style={{ background: "#0f0f10", border: "1px solid rgba(255,255,255,0.07)" }}
        data-testid="forgot-password-card"
      >
        {/* Top orange line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, #f97316, #fb923c, transparent)" }} />

        <div className="p-8">
          {/* Logo */}
          <Link to="/" className="mb-8 flex items-center gap-2 w-fit">
            <Logo />
          </Link>

          {sent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              data-testid="forgot-password-success-message"
            >
              {/* Animated checkmark */}
              <div className="mb-6 flex justify-center">
                <div
                  className="fp-bounce-in flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              </div>
              <h1 className="text-[26px] font-[800] tracking-tight text-white text-center">Check your inbox.</h1>
              <p className="mt-2 text-[14px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                We&apos;ve shot a reset link to <span className="font-semibold text-orange-400">{sentEmail}</span>. Should land within a few minutes.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                <p>Didn&apos;t get it? Check spam or</p>
                <button onClick={() => { setSent(false); setSentEmail(""); }} className="font-semibold" style={{ color: "#f97316" }}>try again</button>
              </div>
              <Link
                to="/login"
                className="mt-5 flex items-center justify-center gap-2 text-[13px] font-medium"
                style={{ color: "rgba(255,255,255,0.4)" }}
                data-testid="forgot-password-back-to-login-link"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                Back to login
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Animated lock icon */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div
                    className="fp-lock-anim flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}
                  >
                    🔑
                  </div>
                  {/* Shoot animation when submitting */}
                  {showShoot && (
                    <div className="fp-shoot absolute top-2 left-3 text-lg">📨</div>
                  )}
                </div>
              </div>

              <h1 className="text-[26px] font-[800] tracking-tight text-white">Lost your key?</h1>
              <p className="mt-1.5 text-[14px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                No worries — we&apos;ll send you a secure reset link right away.
              </p>

              {/* Dynamic hint */}
              {emailVal.includes("@") && emailVal.includes(".") && (
                <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.15)" }}>
                  <span>📬</span>
                  <span className="text-[13px] font-medium" style={{ color: "#fb923c" }}>Ready — hit the button to send!</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" data-testid="forgot-password-form">
                <div>
                  <label className="auth-label mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="fp-input h-11 w-full rounded-xl px-4 text-[14px]"
                    data-testid="forgot-password-email-input"
                    {...register("email")}
                  />
                  {errors.email && <p className="mt-1 text-[12px] text-red-400">{errors.email.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="fp-btn h-11 w-full rounded-xl text-[14px] font-semibold"
                  data-testid="forgot-password-submit-button"
                >
                  {isSubmitting ? "Sending…" : "Send Reset Link →"}
                </button>
              </form>
              <Link
                to="/login"
                className="mt-5 flex items-center justify-center gap-2 text-[13px] font-medium"
                style={{ color: "rgba(255,255,255,0.35)" }}
                data-testid="forgot-password-back-to-login-link"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                Back to login
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

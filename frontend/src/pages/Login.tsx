import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const emailVal = watch("email") ?? "";
  const passVal  = watch("password") ?? "";

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    }
  };

  // Dynamic message based on form state
  const getMessage = () => {
    if (passVal.length >= 6) return { icon: "🔓", text: "Looking good — hit Log In!" };
    if (passVal.length > 0) return { icon: "🔐", text: "Keep going…" };
    if (emailVal.includes("@")) return { icon: "✉️", text: "Great email — now your password." };
    if (emailVal.length > 3) return { icon: "⌨️", text: "Type the rest of your email…" };
    return null;
  };
  const msg = getMessage();

  return (
    <AuthLayout mode="login">
      {/* Heading */}
      <h1 className="text-[32px] font-[800] tracking-tight text-white">Welcome back.</h1>
      <p className="mt-1.5 text-[14px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        Log in to keep your pipeline moving.
      </p>

      {/* Dynamic hint */}
      {msg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 auth-type-in" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.15)" }}>
          <span>{msg.icon}</span>
          <span className="text-[13px] font-medium" style={{ color: "#fb923c" }}>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" data-testid="login-form">
        <div>
          <label className="auth-label mb-1.5 block">Email</label>
          <input
            type="email"
            placeholder="you@company.com"
            className="auth-input h-11 w-full rounded-xl px-4 text-[14px]"
            data-testid="login-email-input"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-[12px] text-red-400" data-testid="login-email-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="auth-label mb-1.5 block">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="auth-input h-11 w-full rounded-xl px-4 pr-11 text-[14px]"
              data-testid="login-password-input"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(255,255,255,0.3)" }}
              data-testid="login-toggle-password-visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-[12px] text-red-400" data-testid="login-password-error">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <input type="checkbox" className="rounded" style={{ accentColor: "#f97316" }} data-testid="login-remember-me-checkbox" />
            Remember me
          </label>
          <Link to="/forgot-password" className="auth-link text-[13px] font-medium" data-testid="login-forgot-password-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-btn-primary h-11 w-full rounded-xl text-[14px] font-semibold"
          data-testid="login-submit-button"
        >
          {isSubmitting ? "Logging in…" : "Log In →"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-[12px]" style={{ color: "rgba(255,255,255,0.2)" }}>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        or continue with
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["Google","Microsoft"].map(p => (
          <button key={p} type="button" className="h-10 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid={`login-${p.toLowerCase()}-button`}>
            {p}
          </button>
        ))}
      </div>

      <p className="mt-7 text-center text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        New to Smady?{" "}
        <Link to="/signup" className="auth-link font-semibold" data-testid="login-signup-link">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { AuthLayout } from "@/layouts/AuthLayout";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Enter your company name"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  terms: z.boolean().refine((v) => v, "You must agree to continue"),
});
type FormData = z.infer<typeof schema>;

function pwStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { label: "Weak", pct: 25, color: "#ef4444" };
  if (s <= 2) return { label: "Fair", pct: 55, color: "#f97316" };
  if (s <= 3) return { label: "Good", pct: 80, color: "#fb923c" };
  return { label: "Strong 💪", pct: 100, color: "#22c55e" };
}

// Progress steps shown above form
const STEPS = ["Your info", "Set password", "You're in"];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [terms, setTerms] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { terms: false } });

  const name = watch("fullName") ?? "";
  const email = watch("email") ?? "";
  const company = watch("company") ?? "";

  // Determine current step
  const currentStep = password.length >= 6 ? 2 : (name.length >= 2 && email.includes("@") && company.length >= 2) ? 1 : 0;

  const strength = useMemo(() => pwStrength(password), [password]);

  const onSubmit = async (data: FormData) => {
    try {
      await signup(data.fullName, data.email, data.company, data.password);
      toast.success("Account created — welcome to Smady!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signup failed");
    }
  };

  return (
    <AuthLayout mode="signup">
      {/* Progress indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all"
              style={{
                background: i <= currentStep ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(255,255,255,0.07)",
                color: i <= currentStep ? "#fff" : "rgba(255,255,255,0.3)",
              }}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className="text-[11px] font-medium" style={{ color: i <= currentStep ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: i < currentStep ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.07)" }} />}
          </div>
        ))}
      </div>

      <h1 className="text-[28px] font-[800] tracking-tight text-white">Create your account.</h1>
      <p className="mt-1.5 text-[14px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        Your ICP engine starts in under 5 minutes.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5" data-testid="signup-form">
        <div>
          <label className="auth-label mb-1.5 block">Full Name</label>
          <input type="text" placeholder="Alex Morgan" className="auth-input h-11 w-full rounded-xl px-4 text-[14px]" data-testid="signup-fullname-input" {...register("fullName")} />
          {errors.fullName && <p className="mt-1 text-[12px] text-red-400">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="auth-label mb-1.5 block">Work Email</label>
          <input type="email" placeholder="alex@company.com" className="auth-input h-11 w-full rounded-xl px-4 text-[14px]" data-testid="signup-email-input" {...register("email")} />
          {errors.email && <p className="mt-1 text-[12px] text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="auth-label mb-1.5 block">Company Name</label>
          <input type="text" placeholder="Northwind Analytics" className="auth-input h-11 w-full rounded-xl px-4 text-[14px]" data-testid="signup-company-input" {...register("company")} />
          {errors.company && <p className="mt-1 text-[12px] text-red-400">{errors.company.message}</p>}
        </div>

        <div>
          <label className="auth-label mb-1.5 block">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="min. 6 characters"
              className="auth-input h-11 w-full rounded-xl px-4 pr-11 text-[14px]"
              data-testid="signup-password-input"
              {...register("password", { onChange: e => setPassword(e.target.value) })}
            />
            <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
              {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-[12px] text-red-400">{errors.password.message}</p>}
          {/* Password strength bar */}
          {password.length > 0 && (
            <div className="mt-2" data-testid="signup-password-strength">
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${strength.pct}%`, background: strength.color }} />
              </div>
              <p className="mt-1 text-[11px] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          <input
            type="checkbox"
            className="mt-0.5 rounded"
            style={{ accentColor: "#f97316" }}
            checked={terms}
            onChange={e => { setTerms(e.target.checked); setValue("terms", e.target.checked); }}
            data-testid="signup-terms-checkbox"
          />
          I agree to the Terms of Service and Privacy Policy
        </label>
        {errors.terms && <p className="text-[12px] text-red-400">{errors.terms.message}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-btn-primary h-11 w-full rounded-xl text-[14px] font-semibold"
          data-testid="signup-submit-button"
        >
          {isSubmitting ? "Creating account…" : "Create Free Account"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[12px]" style={{ color: "rgba(255,255,255,0.2)" }}>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        or continue with
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["Google","Microsoft"].map(p => (
          <button key={p} type="button" className="h-10 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid={`signup-${p.toLowerCase()}-button`}>
            {p}
          </button>
        ))}
      </div>
      <p className="mt-5 text-center text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        Already have an account?{" "}
        <Link to="/login" className="auth-link font-semibold" data-testid="signup-login-link">Log in</Link>
      </p>
    </AuthLayout>
  );
}

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/sonner";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Enter your company name"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  terms: z.boolean().refine((v) => v, "You must agree to continue"),
});
type FormData = z.infer<typeof schema>;

function passwordStrength(password: string): { label: "Weak" | "Medium" | "Strong"; percent: number; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", percent: 33, color: "bg-danger" };
  if (score <= 2) return { label: "Medium", percent: 66, color: "bg-amber-500" };
  return { label: "Strong", percent: 100, color: "bg-success" };
}

function RightPanel() {
  const steps = [
    { num: "1", text: "Tell us about your product" },
    { num: "2", text: "We build your ICP" },
    { num: "3", text: "Leads start rolling in" },
  ];
  return (
    <div data-testid="signup-right-panel">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">What happens next</p>
      <div className="mt-4 space-y-4">
        {steps.map((s) => (
          <div key={s.num} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light font-display text-sm font-semibold text-primary-600">
              {s.num}
            </span>
            <p className="text-sm font-medium text-ink">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [terms, setTerms] = useState(false);
  const [password, setPassword] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { terms: false } });

  const strength = useMemo(() => passwordStrength(password), [password]);

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
    <AuthLayout rightPanel={<RightPanel />}>
      <h1 className="font-display text-[32px] font-semibold text-ink">Create your account.</h1>
      <p className="mt-2 text-sm text-body">Set up your ICP engine in under 5 minutes.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" data-testid="signup-form">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Full Name</label>
          <Input placeholder="Alex Morgan" data-testid="signup-fullname-input" {...register("fullName")} />
          {errors.fullName && <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Work Email</label>
          <Input type="email" placeholder="alex@company.com" data-testid="signup-email-input" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Company Name</label>
          <Input placeholder="Northwind Analytics" data-testid="signup-company-input" {...register("company")} />
          {errors.company && <p className="mt-1 text-xs text-danger">{errors.company.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            data-testid="signup-password-input"
            {...register("password", { onChange: (e) => setPassword(e.target.value) })}
          />
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
          {password.length > 0 && (
            <div className="mt-2" data-testid="signup-password-strength">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className={cn("h-full rounded-full transition-all", strength.color)} style={{ width: `${strength.percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] font-medium text-muted">{strength.label} password</p>
            </div>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-body">
          <Checkbox
            data-testid="signup-terms-checkbox"
            checked={terms}
            onCheckedChange={(v: boolean) => {
              setTerms(!!v);
              setValue("terms", !!v);
            }}
          />
          I agree to the Terms of Service and Privacy Policy
        </label>
        {errors.terms && <p className="text-xs text-danger">{errors.terms.message}</p>}
        <ButtonPrimary type="submit" fullWidth loading={isSubmitting} data-testid="signup-submit-button">
          Create Free Account
        </ButtonPrimary>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ButtonOutline type="button" data-testid="signup-google-button">
          Google
        </ButtonOutline>
        <ButtonOutline type="button" data-testid="signup-microsoft-button">
          Microsoft
        </ButtonOutline>
      </div>
      <p className="mt-8 text-center text-sm text-body">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary-500" data-testid="signup-login-link">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

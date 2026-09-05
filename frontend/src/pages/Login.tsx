import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

function RightPanel() {
  return (
    <div data-testid="login-right-panel">
      <div className="flex items-center gap-2 text-primary-500">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Customer Story</span>
      </div>
      <p className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
        "Smady found us 340 qualified leads in our first month — without adding a single person to the team."
      </p>
      {/* Placeholder: replace with a real customer quote once available */}
      <p className="mt-3 text-xs italic text-muted">— Placeholder quote, to be replaced with a real customer testimonial before launch</p>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    }
  };

  return (
    <AuthLayout rightPanel={<RightPanel />}>
      <h1 className="font-display text-[32px] font-semibold text-ink">Welcome back.</h1>
      <p className="mt-2 text-sm text-body">Log in to keep your pipeline moving.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" data-testid="login-form">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Email</label>
          <Input type="email" placeholder="you@company.com" data-testid="login-email-input" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-xs text-danger" data-testid="login-email-error">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Password</label>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" data-testid="login-password-input" {...register("password")} />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              data-testid="login-toggle-password-visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-danger" data-testid="login-password-error">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-body">
            <Checkbox data-testid="login-remember-me-checkbox" /> Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary-500" data-testid="login-forgot-password-link">
            Forgot password?
          </Link>
        </div>
        <ButtonPrimary type="submit" fullWidth loading={isSubmitting} data-testid="login-submit-button">
          Log In
        </ButtonPrimary>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ButtonOutline type="button" data-testid="login-google-button">
          Google
        </ButtonOutline>
        <ButtonOutline type="button" data-testid="login-microsoft-button">
          Microsoft
        </ButtonOutline>
      </div>
      <p className="mt-8 text-center text-sm text-body">
        New to Smady?{" "}
        <Link to="/signup" className="font-semibold text-primary-500" data-testid="login-signup-link">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

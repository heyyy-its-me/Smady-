import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ButtonPrimary } from "@/components/smady/Button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/smady/Logo";
import { api, formatApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSentEmail(data.email);
      setSent(true);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6" style={{ background: "#FFF8F1" }}>
      <div className="blob-field" style={{ opacity: 0.5 }}>
        <div className="blob blob-orange" style={{ width: 380, height: 380, top: "-100px", left: "10%" }} />
        <div className="blob blob-yellow" style={{ width: 320, height: 320, bottom: "-80px", right: "10%" }} />
      </div>
      <div className="relative z-[1] w-full max-w-[440px] rounded-3xl bg-white p-10 shadow-card" data-testid="forgot-password-card">
        <Link to="/" className="mb-8 inline-block">
          <Logo />
        </Link>
        {sent ? (
          <div data-testid="forgot-password-success-message">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" strokeWidth={1.5} />
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Check your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-body">
              We've sent a password reset link to <strong className="text-ink">{sentEmail}</strong>. It should arrive within a few minutes.
            </p>
            <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-body hover:text-ink" data-testid="forgot-password-back-to-login-link">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[28px] font-semibold text-ink">Reset your password.</h1>
            <p className="mt-2 text-sm text-body">Enter your email and we'll send you a link to reset it.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" data-testid="forgot-password-form">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Email</label>
                <Input type="email" placeholder="you@company.com" data-testid="forgot-password-email-input" {...register("email")} />
                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
              </div>
              <ButtonPrimary type="submit" fullWidth loading={isSubmitting} data-testid="forgot-password-submit-button">
                Send Reset Link
              </ButtonPrimary>
            </form>
            <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-body hover:text-ink" data-testid="forgot-password-back-to-login-link">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

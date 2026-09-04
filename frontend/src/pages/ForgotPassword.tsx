import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ButtonPrimary } from "@/components/smady/Button";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (_data: FormData) => {
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-extrabold text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-body">We'll email you a reset link.</p>
      {sent ? (
        <div className="mt-8 rounded-2xl bg-primary-50 p-4 text-sm text-primary-600" data-testid="forgot-password-success-message">
          Check your inbox — a reset link is on its way.
        </div>
      ) : (
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
      )}
      <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-body hover:text-ink" data-testid="forgot-password-back-to-login-link">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back to login
      </Link>
    </AuthLayout>
  );
}

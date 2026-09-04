import { useState } from "react";
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

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Enter your company name"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  terms: z.boolean().refine((v) => v, "You must agree to continue"),
});
type FormData = z.infer<typeof schema>;

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [terms, setTerms] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { terms: false } });

  const onSubmit = async (data: FormData) => {
    await signup(data.fullName, data.email, data.company, data.password);
    toast.success("Account created — welcome to Smady!");
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-extrabold text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-body">Set up your ICP engine in minutes.</p>
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
          <Input type="password" placeholder="••••••••" data-testid="signup-password-input" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
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
          I agree to the Terms &amp; Privacy Policy
        </label>
        {errors.terms && <p className="text-xs text-danger">{errors.terms.message}</p>}
        <ButtonPrimary type="submit" fullWidth loading={isSubmitting} data-testid="signup-submit-button">
          Create Account
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

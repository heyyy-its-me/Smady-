import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Logo } from "@/components/smady/Logo";
import { api, formatApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error("This reset link is missing or invalid. Request a new one.");
      return;
    }
    if (password.length < 15 || password.length > 128) {
      toast.error("Use a password between 15 and 128 characters.");
      return;
    }
    if (password !== confirmation) {
      toast.error("The passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setUpdated(true);
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080808] px-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(249,115,22,0.09),transparent_38%)]" />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f10] p-8 shadow-2xl" data-testid="reset-password-card">
        <Link to="/" aria-label="Smady home" className="mb-8 inline-flex"><Logo /></Link>
        {updated ? (
          <div className="text-center" data-testid="reset-password-success">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-green-400/20 bg-green-400/10 text-green-400">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold">Password updated</h1>
            <p className="mt-2 text-sm text-white/55">Your password has been reset. You can now sign in.</p>
            <Link to="/login" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 text-sm font-semibold hover:bg-orange-500">Go to login</Link>
          </div>
        ) : !token ? (
          <div data-testid="reset-password-missing-token">
            <h1 className="text-2xl font-extrabold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-white/55">This link is missing its token. Request a fresh password-reset email.</p>
            <Link to="/forgot-password" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 text-sm font-semibold hover:bg-orange-500">Request a new link</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">Choose a new password</h1>
            <p className="mt-2 text-sm text-white/55">Use a passphrase between 15 and 128 characters.</p>
            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="reset-password-form">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                New password
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={15}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm normal-case text-white outline-none focus:border-orange-500/60"
                  data-testid="reset-password-new-password"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                Confirm new password
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={15}
                  maxLength={128}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm normal-case text-white outline-none focus:border-orange-500/60"
                  data-testid="reset-password-confirm-password"
                />
              </label>
              <button type="submit" disabled={saving} className="h-11 w-full rounded-xl bg-orange-600 text-sm font-semibold hover:bg-orange-500 disabled:opacity-50" data-testid="reset-password-submit">
                {saving ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </section>
    </main>
  );
}

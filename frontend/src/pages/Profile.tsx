import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/layouts/PageHeader";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { Mail, Building2, Zap, User, Copy, Link2, Unlink } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [googleDisclosureAccepted, setGoogleDisclosureAccepted] = useState(false);

  useEffect(() => {
    api.get("/integrations/google/status")
      .then(({ data }) => setGoogleStatus(data))
      .catch(() => setGoogleStatus({ connected: false, email: null }));
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") toast.success("Google account connected");
    if (params.get("google") === "error") toast.error("Google account could not be connected. Please try again.");
    if (params.has("google")) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const disconnectGoogle = async () => {
    setDisconnectingGoogle(true);
    try {
      await api.delete("/integrations/google");
      setGoogleStatus({ connected: false, email: null });
      setGoogleDisclosureAccepted(false);
      toast.success("Google account disconnected");
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted">Loading profile...</p>
      </div>
    );
  }

  const profileFields = [
    {
      label: "User ID",
      value: user.id,
      icon: User,
      testId: "profile-id",
    },
    {
      label: "Full Name",
      value: user.name,
      icon: User,
      testId: "profile-name",
    },
    {
      label: "Email",
      value: user.email,
      icon: Mail,
      testId: "profile-email",
    },
    {
      label: "Organization",
      value: user.company,
      icon: Building2,
      testId: "profile-company",
    },
    {
      label: "Plan",
      value: user.plan,
      icon: Zap,
      testId: "profile-plan",
    },
  ];

  return (
    <div data-testid="profile-page">
      <PageHeader />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-2xl border border-primary-100/70 bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col items-center text-center">
            <AvatarInitial name={user.name} size={80} />
            <h2 className="mt-4 font-display text-2xl font-bold text-ink">{user.name}</h2>
            <p className="mt-1 text-sm text-muted">{user.company}</p>
            <div className="mt-3 inline-flex rounded-full border border-primary-200/60 bg-primary-50 px-3 py-1">
              <span className="text-xs font-semibold text-primary-600">{user.plan}</span>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="rounded-2xl border border-primary-100/70 bg-surface p-8 shadow-card">
          <h3 className="mb-6 font-display text-lg font-bold text-ink">Account Details</h3>
          <div className="space-y-4">
            {profileFields.map(({ label, value, icon: Icon, testId }) => (
              <div
                key={testId}
                className="flex items-center justify-between rounded-xl border border-primary-100/60 bg-primary-50/50 p-4"
                data-testid={testId}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                    <Icon className="h-5 w-5 text-primary-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">{label}</p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{value}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(value, testId)}
                  className="rounded-lg p-2 text-muted hover:bg-white/50 transition-colors"
                  title="Copy to clipboard"
                  data-testid={`${testId}-copy`}
                >
                  <Copy className={`h-4 w-4 transition-colors ${copiedField === testId ? "text-primary-500" : ""}`} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-primary-100/70 bg-surface p-8 shadow-card" data-testid="google-connection-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Google account</h3>
            <p className="mt-1 text-sm text-muted">
              {googleStatus?.connected
                ? `Connected as ${googleStatus.email}. Smady and your n8n workflows can send mail and create calendar events.`
                : "Connect the Google account you want Smady and n8n to use for email and calendar events."}
            </p>
            {!googleStatus?.connected && (
              <div className="mt-4 max-w-2xl rounded-xl border border-primary-100 bg-primary-50/70 p-4 text-sm leading-relaxed text-ink">
                <p><strong>What access means:</strong> Connecting Google lets Smady use Gmail to send messages you request and your owned Google Calendar to create events and Meet links. Smady does not read your inbox. OAuth tokens are encrypted in Smady and short-lived access tokens are passed to the configured n8n workflow to complete the requested action.</p>
                <p className="mt-2">We do not use Google data for advertising or generalized AI training. Read our <Link to="/privacy" className="font-semibold text-primary-700 underline">Privacy Policy</Link> for details.</p>
                <label className="mt-3 flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={googleDisclosureAccepted}
                    onChange={(event) => setGoogleDisclosureAccepted(event.target.checked)}
                    className="mt-1 accent-orange-600"
                    data-testid="google-disclosure-consent-checkbox"
                  />
                  <span>I understand and agree to connect Gmail and Calendar for these features.</span>
                </label>
              </div>
            )}
          </div>
          {googleStatus?.connected ? (
            <button
              type="button"
              onClick={disconnectGoogle}
              disabled={disconnectingGoogle}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              data-testid="google-disconnect-button"
            >
              <Unlink className="h-4 w-4" />
              {disconnectingGoogle ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.assign("/api/auth/google/start?intent=connect")}
              disabled={!googleDisclosureAccepted}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              data-testid="google-connect-button"
            >
              <Link2 className="h-4 w-4" />
              Connect Google
            </button>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 rounded-2xl border border-primary-100/70 bg-surface p-8 shadow-card">
        <h3 className="mb-4 font-display text-lg font-bold text-ink">Account Information</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Account Status</p>
            <div className="mt-2 inline-flex rounded-full border border-green-200/60 bg-green-50 px-3 py-1.5">
              <span className="text-sm font-semibold text-green-700">● Active</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Member Since</p>
            <p className="mt-2 text-sm font-medium text-ink">{user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

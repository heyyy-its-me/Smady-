import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/layouts/PageHeader";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { Mail, Building2, Zap, User, Copy } from "lucide-react";
import { ButtonPrimary } from "@/components/smady/Button";
import { toast } from "@/components/ui/sonner";
import { useState } from "react";

export default function Profile() {
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

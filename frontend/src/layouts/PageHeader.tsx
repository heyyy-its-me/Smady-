import React from "react";
import { useAuth } from "@/context/AuthContext";
import { PlanBadge } from "@/components/smady/Badge";

export function PageHeader({ actions }: { actions?: React.ReactNode }) {
  const { user } = useAuth();
  const firstName = (user?.name || "").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold text-ink" data-testid="page-header-greeting">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <PlanBadge text={user?.plan || "Pro Plan"} />
        </div>
        <p className="mt-1 text-sm text-muted">{today} · Here's what's happening with your pipeline.</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

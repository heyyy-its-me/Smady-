import React from "react";
import { useAuth } from "@/context/AuthContext";
import { PlanBadge } from "@/components/smady/Badge";

export function PageHeader({ actions }: { actions?: React.ReactNode }) {
  const { user } = useAuth();
  const firstName = (user?.name || "Alex Morgan").split(" ")[0];
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink" data-testid="page-header-greeting">
            {firstName}
          </h1>
          <PlanBadge text={user?.plan || "Pro Plan"} />
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

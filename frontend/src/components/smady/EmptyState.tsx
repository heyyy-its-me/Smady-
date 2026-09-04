import type { LucideIcon } from "lucide-react";
import { ButtonPrimary } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-surface px-6 py-16 text-center shadow-card" data-testid="empty-state">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <Icon className="h-7 w-7 text-primary-500" strokeWidth={1.5} />
      </div>
      <p className="mt-5 text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{subtitle}</p>
      {actionLabel && (
        <ButtonPrimary className="mt-6" onClick={onAction} data-testid="empty-state-action-button">
          {actionLabel}
        </ButtonPrimary>
      )}
    </div>
  );
}

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

export function FieldInput({ icon: Icon, className, ...props }: FieldInputProps) {
  return (
    <div className="group relative self-start">
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors duration-150 group-focus-within:text-primary-500"
          strokeWidth={1.5}
        />
      )}
      <input
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] placeholder:text-muted transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:shadow-[0_4px_16px_-4px_rgba(249,98,44,0.25)]",
          Icon && "pl-10",
          className,
        )}
        {...props}
      />
    </div>
  );
}

interface FieldTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: LucideIcon;
}

export function FieldTextarea({ icon: Icon, className, ...props }: FieldTextareaProps) {
  return (
    <div className="group relative self-start">
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-3.5 top-4 h-4 w-4 text-muted transition-colors duration-150 group-focus-within:text-primary-500"
          strokeWidth={1.5}
        />
      )}
      <textarea
        className={cn(
          "min-h-[104px] w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] placeholder:text-muted transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:shadow-[0_4px_16px_-4px_rgba(249,98,44,0.25)]",
          Icon && "pl-10",
          className,
        )}
        {...props}
      />
    </div>
  );
}

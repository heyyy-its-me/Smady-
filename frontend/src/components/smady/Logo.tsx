import { cn } from "@/lib/utils";

export function Logo({ dark = false, iconOnly = false }: { dark?: boolean; iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2" data-testid="smady-logo">
      <img 
        src="https://res.cloudinary.com/kwyrhjzo/image/upload/v1790159384/smady_logo.png" 
        alt="Smady" 
        className="h-8 w-8 rounded-full object-cover"
        onError={(e) => console.error("Logo image failed to load:", e)}
      />
      {!iconOnly && (
        <span className={cn("font-display text-lg font-800 tracking-tight", dark ? "text-white" : "text-ink")}>
          Smady
        </span>
      )}
    </div>
  );
}

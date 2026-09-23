import { cn } from "@/lib/utils";

export function Logo({ dark = false, iconOnly = false }: { dark?: boolean; iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2" data-testid="smady-logo">
      <svg 
        className="h-8 w-8 rounded-full" 
        viewBox="0 0 200 200" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="smaLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#F9622C", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#FF8C42", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#smaLogo)" />
        <circle cx="100" cy="100" r="85" fill="white" opacity="0.95" />
        <text x="100" y="125" textAnchor="middle" fontSize="72" fontWeight="700" fill="#F9622C" fontFamily="Clash Display, sans-serif">S</text>
      </svg>
      {!iconOnly && (
        <span className={cn("font-display text-lg font-800 tracking-tight", dark ? "text-white" : "text-ink")}>
          Smady
        </span>
      )}
    </div>
  );
}

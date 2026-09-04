import { cn, slug } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AvatarInitial({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 font-bold text-white shadow-sm"
      data-testid={`avatar-${slug(name)}`}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex items-center" data-testid="avatar-stack">
      {shown.map((n, i) => (
        <div
          key={n}
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary-100 text-[10px] font-semibold text-primary-700"
        >
          {initials(n)}
        </div>
      ))}
      {extra > 0 && (
        <div style={{ marginLeft: -8 }} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-muted/25 text-[10px] font-semibold text-body">
          +{extra}
        </div>
      )}
    </div>
  );
}

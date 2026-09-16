import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, slug } from "@/lib/utils";

interface KebabMenuProps {
  items: { label: string; onClick?: () => void; danger?: boolean }[];
  testId?: string;
}

export function KebabMenu({ items, testId = "row-kebab-menu" }: KebabMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button data-testid={testId} className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-bg">
          <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} onClick={item.onClick} data-testid={`kebab-item-${slug(item.label)}`} className={cn(item.danger && "text-danger")}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

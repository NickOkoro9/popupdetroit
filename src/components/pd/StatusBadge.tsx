import { STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = STATUS_META[status] ?? STATUS_META["potential_opportunity"]!;
  return (
    <span title={m.desc} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", m.cls, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

export function MatchStatusPill({ status }: { status: "bookable" | "inquiry" | "excluded" }) {
  const map = {
    bookable: ["Bookable request", "bg-status-verified-bg text-status-verified"],
    inquiry: ["Inquiry opportunity", "bg-warn-bg text-warn"],
    excluded: ["Not eligible", "bg-destructive/10 text-destructive"],
  } as const;
  const [l, c] = map[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", c)}>{l}</span>;
}

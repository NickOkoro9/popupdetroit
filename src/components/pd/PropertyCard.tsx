import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { MatchResult, Property } from "@/lib/matching/types";
import { AMENITIES } from "@/lib/matching/types";
import { fmtDate, priceLabel, sqftLabel } from "@/lib/format";
import { MatchStatusPill, StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function PropertyCard({ p, match, selected, onHover, explanation }: {
  p: Property; match?: MatchResult; selected?: boolean; onHover?: () => void; explanation?: string | undefined;
}) {
  const ams = p.amenities.map((a) => AMENITIES.find((x) => x.value === a)?.label ?? a);
  return (
    <article
      id={`card-${p.id}`}
      onMouseEnter={onHover}
      onClick={onHover}
      className={cn(
        "rounded-xl border bg-card p-5 shadow-card transition-all",
        selected ? "border-primary ring-1 ring-primary" : "border-border",
        match?.status === "excluded" && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={p.verification_status} />
        {match && <MatchStatusPill status={match.status} />}
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <Link to="/property/$id" params={{ id: p.id }} className="font-display text-xl leading-tight hover:underline">{p.name}</Link>
          <p className="mt-1 text-sm text-muted-foreground">{p.neighborhood ?? "Neighborhood unknown"} · {p.property_type ?? "Type not listed"} · {sqftLabel(p)}</p>
        </div>
        {match && (
          <div className="shrink-0 text-right">
            <div className="font-display text-3xl leading-none">{match.score}</div>
            <div className="eyebrow mt-1">match</div>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm font-medium">{priceLabel(p)}</p>
      <p className="text-sm text-muted-foreground">{p.short_term_confirmed ? "Short-term availability confirmed" : "Availability not confirmed"}</p>
      {ams.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Listed: {ams.join(", ")}</p>}
      {explanation && <p className="mt-3 rounded-lg bg-muted p-3 text-sm leading-relaxed">{explanation}</p>}
      {match && match.status === "excluded" && (
        <p className="mt-3 text-sm text-destructive">{match.checks.filter((c) => c.result === "fail").map((c) => c.detail).join(" ")}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          {p.source_name} <ExternalLink className="size-3" />
        </a>
        <span>Last checked {fmtDate(p.last_verified)}</span>
      </div>
    </article>
  );
}

import type { Property } from "./matching/types";

export const STATUS_META: Record<string, { label: string; cls: string; desc: string }> = {
  verified_short_term: { label: "Verified Short-Term", cls: "bg-status-verified-bg text-status-verified", desc: "Owner or authorized manager confirmed temporary occupancy terms and availability." },
  advertised_for_lease: { label: "Advertised for Lease", cls: "bg-status-advertised-bg text-status-advertised", desc: "Publicly marketed; short-term arrangements are unconfirmed." },
  potential_opportunity: { label: "Potential Opportunity", cls: "bg-status-potential-bg text-status-potential", desc: "Property exists; availability and owner willingness are not established." },
};

export function priceLabel(p: Property): string {
  if (p.price_amount == null) return "Pricing requires inquiry";
  const n = `$${Number(p.price_amount).toLocaleString()}`;
  switch (p.price_period) {
    case "per_day": return `${n} / day`;
    case "per_weekend": return `${n} / weekend`;
    case "per_week": return `${n} / week`;
    case "per_month": return `${n} / month`;
    case "per_sf_year": return `${n}/SF/yr (long-term lease rate)`;
    default: return n;
  }
}

export const sqftLabel = (p: Property) =>
  p.sqft_min == null && p.sqft_max == null ? "Size not listed"
    : p.sqft_min === p.sqft_max || p.sqft_max == null ? `${(p.sqft_min ?? p.sqft_max)!.toLocaleString()} SF`
    : `${p.sqft_min?.toLocaleString()}–${p.sqft_max.toLocaleString()} SF`;

export const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const ctaFor = (status: string) =>
  status === "verified_short_term" ? { type: "request_to_book" as const, label: "Request to Book" }
    : status === "advertised_for_lease" ? { type: "flexible_lease" as const, label: "Propose Flexible Lease" }
    : { type: "information" as const, label: "Request Information" };

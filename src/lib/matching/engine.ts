// Opportunity Engine: deterministic eligibility screening + weighted, explainable scoring.
// Pure functions only. The AI layer may explain these results but never produces scores.
import {
  AMENITIES,
  DURATIONS,
  type Check,
  type MatchResult,
  type MatchStatus,
  type Property,
  type Requirements,
  type ScoreComponent,
} from "./types";

export const WEIGHTS = {
  location: 0.25,
  price: 0.25,
  amenities: 0.2,
  business: 0.2,
  flexibility: 0.1,
} as const;

/** Map business category to the use tag property records use in permitted/prohibited lists. */
export function useTagFor(category: Requirements["category"]): string | null {
  switch (category) {
    case "Fashion and apparel":
    case "General retail":
    case "Beauty and cosmetics":
      return "retail";
    case "Art and exhibitions":
      return "gallery";
    case "Workshops and education":
      return "education";
    case "Food and beverage":
      return "restaurant";
    case "Private events":
      return "events";
    case "Professional services":
      return "office";
    default:
      return null;
  }
}

const amenityLabel = (a: string) => AMENITIES.find((x) => x.value === a)?.label ?? a;

/** Requested occupancy length in days. Explicit dates win over the duration preset. */
export function requestedDays(r: Requirements): number | null {
  if (r.startDate && r.endDate) {
    const d = (Date.parse(r.endDate) - Date.parse(r.startDate)) / 86_400_000;
    if (Number.isFinite(d) && d >= 0) return Math.round(d) + 1;
  }
  return DURATIONS.find((d) => d.value === r.duration)?.days ?? null;
}

/**
 * Cost of the requested stay, only when the property publishes a short-term rate.
 * Long-term $/SF/yr rates are NOT converted — that would be an invented price.
 */
export function estimateCost(p: Property, r: Requirements): number | null {
  if (p.price_amount == null) return null;
  const days = requestedDays(r);
  if (days == null) return null;
  switch (p.price_period) {
    case "per_day":
      return p.price_amount * days;
    case "per_weekend":
      return p.price_amount * Math.max(1, Math.ceil(days / 2));
    case "per_week":
      return p.price_amount * Math.max(1, Math.ceil(days / 7));
    case "per_month":
      return p.price_amount * Math.max(1, Math.ceil(days / 30));
    default:
      return null;
  }
}

export function screen(p: Property, r: Requirements): Check[] {
  const checks: Check[] = [];
  const tag = useTagFor(r.category);
  const prohibited = p.prohibited_uses.map((s) => s.toLowerCase());
  const permitted = p.permitted_uses.map((s) => s.toLowerCase());

  // Business use
  if (tag) {
    if (prohibited.includes(tag))
      checks.push({ key: "use", label: "Business use", result: "fail", detail: `Listing explicitly prohibits ${tag} use.` });
    else if (permitted.includes(tag))
      checks.push({ key: "use", label: "Business use", result: "pass", detail: `Listing names ${tag} as a suitable use.` });
    else
      checks.push({ key: "use", label: "Business use", result: "unknown", detail: `Listing does not say whether ${tag} use is allowed.` });
  } else {
    checks.push({ key: "use", label: "Business use", result: "unknown", detail: "Business category not specified." });
  }

  // Regulated activities the entrepreneur said "yes" to
  for (const [act, val] of Object.entries(r.regulated)) {
    if (val !== "yes") continue;
    if (prohibited.includes(act))
      checks.push({ key: `reg_${act}`, label: `Activity: ${act.replace("_", " ")}`, result: "fail", detail: "Listing prohibits this activity." });
    else
      checks.push({ key: `reg_${act}`, label: `Activity: ${act.replace("_", " ")}`, result: "unknown", detail: "Not addressed by the listing; landlord and city approval needed." });
  }

  // Budget
  const cost = estimateCost(p, r);
  if (r.maxBudget != null) {
    if (cost == null)
      checks.push({ key: "budget", label: "Budget", result: "unknown", detail: "No short-term price published — pricing requires inquiry." });
    else if (cost <= r.maxBudget)
      checks.push({ key: "budget", label: "Budget", result: "pass", detail: `$${cost} for your dates is within $${r.maxBudget}.` });
    else
      checks.push({ key: "budget", label: "Budget", result: "fail", detail: `$${cost} for your dates exceeds $${r.maxBudget}.` });
  }

  // Capacity
  const needCap = r.capacity ?? r.expectedAttendance;
  if (needCap != null) {
    if (p.capacity == null)
      checks.push({ key: "capacity", label: "Capacity", result: "unknown", detail: "Listing does not state occupancy capacity." });
    else if (p.capacity >= needCap)
      checks.push({ key: "capacity", label: "Capacity", result: "pass", detail: `Holds ${p.capacity}; you need ${needCap}.` });
    else
      checks.push({ key: "capacity", label: "Capacity", result: "fail", detail: `Holds ${p.capacity}; you need ${needCap}.` });
  }

  // Size
  if (r.minSqft != null) {
    const max = p.sqft_max ?? p.sqft_min;
    if (max == null)
      checks.push({ key: "sqft", label: "Size", result: "unknown", detail: "Square footage not listed." });
    else if (max >= r.minSqft)
      checks.push({ key: "sqft", label: "Size", result: "pass", detail: `Up to ${max.toLocaleString()} SF available.` });
    else
      checks.push({ key: "sqft", label: "Size", result: "fail", detail: `Only ${max.toLocaleString()} SF; you need ${r.minSqft.toLocaleString()}.` });
  }

  // Required amenities
  for (const a of r.amenitiesRequired) {
    if (p.amenities.includes(a))
      checks.push({ key: `am_${a}`, label: amenityLabel(a), result: "pass", detail: "Listed by the source." });
    else if (p.amenities_unavailable.includes(a))
      checks.push({ key: `am_${a}`, label: amenityLabel(a), result: "fail", detail: "Source says this is not available." });
    else
      checks.push({ key: `am_${a}`, label: amenityLabel(a), result: "unknown", detail: "Not mentioned by the source." });
  }

  // Duration
  const days = requestedDays(r);
  if (days != null) {
    if (p.min_duration_days == null)
      checks.push({ key: "duration", label: "Rental length", result: "unknown", detail: p.short_term_confirmed ? "Minimum not stated." : "Listing is for a conventional lease; short stays are unconfirmed." });
    else if (days >= p.min_duration_days)
      checks.push({ key: "duration", label: "Rental length", result: "pass", detail: `Minimum ${p.min_duration_days} day(s).` });
    else
      checks.push({ key: "duration", label: "Rental length", result: "fail", detail: `Minimum rental is ${p.min_duration_days} days; you need ${days}.` });
  }

  // Availability
  if (r.startDate) {
    const s = Date.parse(r.startDate);
    const e = Date.parse(r.endDate ?? r.startDate);
    const from = p.available_from ? Date.parse(p.available_from) : null;
    const to = p.available_to ? Date.parse(p.available_to) : null;
    if ((from != null && s < from) || (to != null && e > to))
      checks.push({ key: "dates", label: "Availability", result: "fail", detail: "Your dates fall outside the published availability window." });
    else if (p.short_term_confirmed && from != null)
      checks.push({ key: "dates", label: "Availability", result: "pass", detail: "Owner-confirmed availability covers your dates." });
    else
      checks.push({ key: "dates", label: "Availability", result: "unknown", detail: "Availability not confirmed for your dates." });
  } else {
    checks.push({ key: "dates", label: "Availability", result: "unknown", detail: "No dates chosen; availability not confirmed." });
  }

  return checks;
}

/** A property is bookable only when verified short-term AND every check passes. */
export function statusFor(p: Property, checks: Check[]): MatchStatus {
  if (checks.some((c) => c.result === "fail")) return "excluded";
  const allPass = checks.every((c) => c.result === "pass");
  if (p.verification_status === "verified_short_term" && p.short_term_confirmed && allPass) return "bookable";
  return "inquiry";
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function score(p: Property, r: Requirements, checks: Check[]): ScoreComponent[] {
  const byKey = (k: string) => checks.find((c) => c.key === k);

  // Location
  let loc: number, locReason: string;
  const prefs = r.neighborhoods;
  if (!prefs.length) { loc = 0.5; locReason = "No neighborhood preference given."; }
  else if (p.neighborhood && prefs.includes(p.neighborhood)) { loc = 1; locReason = `In ${p.neighborhood}, a preferred neighborhood.`; }
  else if (p.neighborhood && r.alternativeNeighborhoods.includes(p.neighborhood)) { loc = 0.7; locReason = `In ${p.neighborhood}, an alternative you accept.`; }
  else if (r.locationFlexible === "yes") { loc = 0.4; locReason = "Outside preferred areas, but you're flexible."; }
  else { loc = 0; locReason = `${p.neighborhood ?? "Unknown neighborhood"} is not in your preferred list.`; }

  // Price
  const b = byKey("budget");
  const cost = estimateCost(p, r);
  let price: number, priceReason: string;
  if (!b) { price = 0.5; priceReason = "No budget given."; }
  else if (b.result === "pass" && cost != null && r.maxBudget) { price = clamp(1 - (cost / r.maxBudget) * 0.3); priceReason = `$${cost} of $${r.maxBudget} budget.`; }
  else if (b.result === "fail") { price = 0; priceReason = b.detail; }
  else { price = 0.3; priceReason = "Short-term price unknown — scored conservatively."; }

  // Amenities (required + preferred)
  const wanted = [...r.amenitiesRequired, ...r.amenitiesPreferred];
  let am: number, amReason: string;
  if (!wanted.length) { am = 1; amReason = "No amenities requested."; }
  else {
    const vals: number[] = wanted.map((a) => (p.amenities.includes(a) ? 1 : p.amenities_unavailable.includes(a) ? 0 : 0.4));
    am = vals.reduce((s, v) => s + v, 0) / vals.length;
    const have = wanted.filter((a) => p.amenities.includes(a)).length;
    amReason = `${have} of ${wanted.length} requested amenities confirmed; unconfirmed ones count partially.`;
  }

  // Business type
  const u = byKey("use");
  const biz = u?.result === "pass" ? 1 : u?.result === "fail" ? 0 : 0.4;

  // Flexibility
  let flex: number, flexReason: string;
  if (p.short_term_confirmed) { flex = 1; flexReason = "Owner confirmed short-term terms."; }
  else if (p.flexible_negotiable === true) { flex = 0.7; flexReason = "Listing says lease terms are negotiable."; }
  else if (p.flexible_negotiable === false) { flex = 0; flexReason = "Listing rules out flexible terms."; }
  else { flex = 0.3; flexReason = "Flexibility not stated."; }

  const mk = (key: ScoreComponent["key"], label: string, value: number, reason: string): ScoreComponent => ({
    key, label, weight: WEIGHTS[key], value, points: Math.round(WEIGHTS[key] * value * 1000) / 10, reason,
  });
  return [
    mk("location", "Location", loc, locReason),
    mk("price", "Price", price, priceReason),
    mk("amenities", "Amenities", am, amReason),
    mk("business", "Business fit", biz, u?.detail ?? ""),
    mk("flexibility", "Lease flexibility", flex, flexReason),
  ];
}

/** Share of decision-relevant facts the record actually provides. */
export function completeness(p: Property): number {
  const facts = [
    p.price_amount != null && p.price_period !== "per_sf_year",
    p.capacity != null,
    p.amenities.length > 0 || p.amenities_unavailable.length > 0,
    p.available_from != null,
    p.permitted_uses.length > 0 || p.prohibited_uses.length > 0,
    p.min_duration_days != null,
    p.sqft_min != null || p.sqft_max != null,
    p.short_term_confirmed,
  ];
  return Math.round((facts.filter(Boolean).length / facts.length) * 100);
}

export function evaluate(p: Property, r: Requirements): MatchResult {
  const checks = screen(p, r);
  const components = score(p, r, checks);
  const status = statusFor(p, checks);
  const outstanding = checks.filter((c) => c.result === "unknown").map((c) => `${c.label}: ${c.detail}`);
  if (r.hasInsurance !== "yes")
    outstanding.push("Insurance: most landlords require liability insurance. Not having it does not exempt you — confirm requirements before occupying.");
  return {
    propertyId: p.id,
    status,
    checks,
    components,
    score: Math.round(components.reduce((s, c) => s + c.points, 0)),
    completeness: completeness(p),
    outstanding,
    estimatedCost: estimateCost(p, r),
  };
}

export function rank(properties: Property[], r: Requirements): MatchResult[] {
  const order: Record<MatchStatus, number> = { bookable: 0, inquiry: 1, excluded: 2 };
  return properties
    .map((p) => evaluate(p, r))
    .sort((a, b) => order[a.status] - order[b.status] || b.score - a.score);
}

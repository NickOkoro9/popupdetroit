import { describe, expect, it } from "vitest";
import { evaluate, rank } from "./engine";
import { emptyRequirements, type Property, type Requirements } from "./types";

const base: Property = {
  id: "p1", name: "Test", address: "1 Test St", neighborhood: "Midtown", lat: 42.35, lng: -83.06,
  coord_precision: "geocoded", property_type: "Retail", sqft_min: 1000, sqft_max: 1000, capacity: 40,
  amenities: ["electricity", "restroom"], amenities_unavailable: [], permitted_uses: ["retail"], prohibited_uses: [],
  price_amount: 250, price_period: "per_day", price_notes: null, available_from: "2026-01-01", available_to: "2027-12-31",
  available_notes: null, min_duration_days: 1, landlord_requirements: [], description: null, source_name: "Test",
  source_url: "https://example.com", last_verified: "2026-11-13", verification_status: "verified_short_term",
  short_term_confirmed: true, flexible_negotiable: true, owner_contact_authorized: true, photo_url: null,
};
const req = (o: Partial<Requirements> = {}): Requirements => ({
  ...emptyRequirements(), category: "Fashion and apparel", neighborhoods: ["Midtown"], duration: "weekend",
  startDate: "2026-12-05", endDate: "2026-12-06", maxBudget: 500, capacity: 20,
  amenitiesRequired: ["electricity", "restroom"], ...o,
});

describe("Opportunity Engine", () => {
  it("A: retail business is excluded where retail is prohibited", () => {
    const r = evaluate({ ...base, permitted_uses: [], prohibited_uses: ["retail"] }, req());
    expect(r.status).toBe("excluded");
    expect(r.checks.find((c) => c.key === "use")?.result).toBe("fail");
  });

  it("B: a $600 rental fails a strict $500 budget", () => {
    const r = evaluate({ ...base, price_amount: 600, price_period: "per_weekend" }, req());
    expect(r.checks.find((c) => c.key === "budget")?.result).toBe("fail");
    expect(r.status).toBe("excluded");
  });

  it("B2: a $500 weekend rental passes a $500 budget", () => {
    const r = evaluate({ ...base, price_amount: 500, price_period: "per_weekend" }, req());
    expect(r.checks.find((c) => c.key === "budget")?.result).toBe("pass");
  });

  it("C: unconfirmed availability is never bookable", () => {
    const r = evaluate({ ...base, short_term_confirmed: false, verification_status: "advertised_for_lease", available_from: null }, req());
    expect(r.status).not.toBe("bookable");
  });

  it("C2: fully verified matching property is bookable", () => {
    expect(evaluate(base, req()).status).toBe("bookable");
  });

  it("D: missing insurance is flagged as outstanding, not exempt", () => {
    const r = evaluate(base, req({ hasInsurance: "no" }));
    expect(r.outstanding.some((o) => o.startsWith("Insurance"))).toBe(true);
  });

  it("E: changing required amenities changes results", () => {
    const p = { ...base, amenities_unavailable: ["wifi"] };
    expect(evaluate(p, req()).status).toBe("bookable");
    expect(evaluate(p, req({ amenitiesRequired: ["wifi"] })).status).toBe("excluded");
  });

  it("long-term $/SF/yr price is not converted into a short-term price", () => {
    const r = evaluate({ ...base, price_amount: 25, price_period: "per_sf_year" }, req());
    expect(r.estimatedCost).toBeNull();
    expect(r.checks.find((c) => c.key === "budget")?.result).toBe("unknown");
  });

  it("unknown capacity is not treated as a match", () => {
    const r = evaluate({ ...base, capacity: null }, req());
    expect(r.checks.find((c) => c.key === "capacity")?.result).toBe("unknown");
    expect(r.status).toBe("inquiry");
  });

  it("score weights sum to 100 for a perfect fit", () => {
    const r = evaluate({ ...base, price_amount: 0 }, req());
    expect(r.score).toBe(100);
  });

  it("ranks bookable above inquiry above excluded", () => {
    const out = rank([
      { ...base, id: "x", prohibited_uses: ["retail"], permitted_uses: [] },
      { ...base, id: "i", capacity: null },
      { ...base, id: "b" },
    ], req());
    expect(out.map((o) => o.propertyId)).toEqual(["b", "i", "x"]);
  });
});

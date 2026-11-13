/**
 * Regression tests for the vintage-clothing test case data-flow bugs.
 *
 * Test case: "I'm launching a vintage clothing pop-up in Midtown Detroit for one
 * weekend. My total budget is $500. I need electricity, a restroom, and capacity
 * for 20 customers. I don't have business liability insurance."
 *
 * Confirmed bugs before the fix:
 *   1. Budget: $1,000 shown instead of $500 — model put $500 in dailyBudget (×2 days)
 *      and left maxBudget null, or set maxBudget to 1000.
 *   2. Capacity: "unspecified" — model put 20 in expectedAttendance only, not capacity.
 *   3. Amenities: only electricity — "a restroom" not placed in amenitiesRequired.
 *   4. Null amenitiesRequired from AI crashes engine's for-of loop.
 *
 * These tests cover:
 *   - Engine behaviour with correctly extracted fields (proving the engine is correct)
 *   - Normalization of null array fields before the merge into req state
 *   - Budget semantics: maxBudget is a hard cap; dailyBudget is irrelevant to exclusion
 */

import { describe, it, expect } from "vitest";
import { evaluate, screen, estimateCost, requestedDays } from "./engine";
import { emptyRequirements, type Property, type Requirements } from "./types";

// ── Shared fixtures ───────────────────────────────────────────────────────────

/** A Midtown retail space that has electricity and a restroom, confirmed short-term. */
const midtownSpace: Property = {
  id: "midtown-1",
  name: "Midtown Retail",
  address: "123 Woodward Ave, Detroit MI",
  neighborhood: "Midtown",
  lat: 42.35, lng: -83.06,
  coord_precision: "geocoded",
  property_type: "Retail",
  sqft_min: 500, sqft_max: 500,
  capacity: 30,
  amenities: ["electricity", "restroom"],
  amenities_unavailable: [],
  permitted_uses: ["retail"],
  prohibited_uses: [],
  price_amount: 250,
  price_period: "per_day",
  price_notes: null,
  available_from: "2026-01-01",
  available_to: "2027-12-31",
  available_notes: null,
  min_duration_days: 1,
  landlord_requirements: [],
  description: null,
  source_name: "Test",
  source_url: "https://example.com",
  last_verified: "2026-11-13",
  verification_status: "verified_short_term",
  short_term_confirmed: true,
  flexible_negotiable: true,
  owner_contact_authorized: true,
  photo_url: null,
};

/** Correctly-extracted requirements for the vintage clothing test case.
 *  startDate/endDate are omitted intentionally to represent "a weekend" with
 *  no specific calendar dates — matching the AI extraction for the test description. */
const vintageReq = (): Requirements => ({
  ...emptyRequirements(),
  category: "Fashion and apparel",
  neighborhoods: ["Midtown"],
  duration: "weekend",
  maxBudget: 500,
  dailyBudget: null,       // "total budget $500" must NOT set dailyBudget
  capacity: 20,
  expectedAttendance: 20,
  amenitiesRequired: ["electricity", "restroom"],
  amenitiesPreferred: [],
  hasInsurance: "no",
});

/** Same as vintageReq but with explicit dates so statusFor can return "bookable". */
const vintageReqWithDates = (): Requirements => ({
  ...vintageReq(),
  startDate: "2026-12-05",
  endDate: "2026-12-06",
});

// ── Bug 1: maxBudget vs dailyBudget ──────────────────────────────────────────

describe("Bug 1 — budget: maxBudget is the hard cap, dailyBudget is irrelevant to exclusion", () => {
  it("$500 budget passes a $500/weekend listing (2 days × $250/day)", () => {
    // 250/day × 2 days = $500 total, budget = $500 → pass
    const r = evaluate(midtownSpace, vintageReq());
    const budgetCheck = r.checks.find((c) => c.key === "budget");
    expect(budgetCheck?.result).toBe("pass");
    expect(r.estimatedCost).toBe(500); // 2 days × $250
  });

  it("$500 budget excludes a listing whose cost for a weekend is $600", () => {
    const expensive = { ...midtownSpace, price_amount: 300, price_period: "per_day" as const };
    // 300/day × 2 days = $600 > $500 budget → fail
    const r = evaluate(expensive, vintageReq());
    const budgetCheck = r.checks.find((c) => c.key === "budget");
    expect(budgetCheck?.result).toBe("fail");
    expect(r.status).toBe("excluded");
  });

  it("setting dailyBudget alone (maxBudget null) does NOT exclude by budget", () => {
    // This is what the broken prompt produced: dailyBudget: 500, maxBudget: null
    // With maxBudget null the engine should not emit a budget check at all
    const wrongExtraction: Requirements = { ...vintageReq(), maxBudget: null, dailyBudget: 500 };
    const r = evaluate(midtownSpace, wrongExtraction);
    // No budget check should exist when maxBudget is null
    expect(r.checks.find((c) => c.key === "budget")).toBeUndefined();
  });

  it("requestedDays returns 2 for a weekend duration", () => {
    expect(requestedDays(vintageReq())).toBe(2);
  });

  it("estimateCost returns 500 for $250/day × 2-day weekend", () => {
    expect(estimateCost(midtownSpace, vintageReq())).toBe(500);
  });
});

// ── Bug 2: capacity extraction ───────────────────────────────────────────────

describe("Bug 2 — capacity: 'capacity for 20 customers' must set capacity, not only expectedAttendance", () => {
  it("capacity 20 passes a space that holds 30", () => {
    const checks = screen(midtownSpace, vintageReq());
    const cap = checks.find((c) => c.key === "capacity");
    expect(cap?.result).toBe("pass");
    expect(cap?.detail).toContain("30");
    expect(cap?.detail).toContain("20");
  });

  it("capacity 20 fails a space that only holds 15", () => {
    const small = { ...midtownSpace, capacity: 15 };
    const checks = screen(small, vintageReq());
    expect(checks.find((c) => c.key === "capacity")?.result).toBe("fail");
  });

  it("using expectedAttendance as fallback when capacity is null still screens correctly", () => {
    // engine uses: const needCap = r.capacity ?? r.expectedAttendance
    const noCapReq: Requirements = { ...vintageReq(), capacity: null, expectedAttendance: 20 };
    const checks = screen(midtownSpace, noCapReq);
    expect(checks.find((c) => c.key === "capacity")?.result).toBe("pass");
  });

  it("when both capacity and expectedAttendance are null, no capacity check is emitted", () => {
    const noCapNoAttend: Requirements = { ...vintageReq(), capacity: null, expectedAttendance: null };
    const checks = screen(midtownSpace, noCapNoAttend);
    expect(checks.find((c) => c.key === "capacity")).toBeUndefined();
  });
});

// ── Bug 3: amenities extraction ──────────────────────────────────────────────

describe("Bug 3 — amenities: 'I need electricity, a restroom' must populate amenitiesRequired with both", () => {
  it("both electricity and restroom in amenitiesRequired produce pass checks", () => {
    const checks = screen(midtownSpace, vintageReq());
    expect(checks.find((c) => c.key === "am_electricity")?.result).toBe("pass");
    expect(checks.find((c) => c.key === "am_restroom")?.result).toBe("pass");
  });

  it("missing restroom in amenitiesRequired (electricity only) does not exclude a space with no restroom — proving the bug", () => {
    // This is what the broken extraction produced: only electricity in amenitiesRequired
    const electricityOnly: Requirements = { ...vintageReq(), amenitiesRequired: ["electricity"] };
    const noRestroom = { ...midtownSpace, amenities: ["electricity"], amenities_unavailable: ["restroom"] };
    // With the broken extraction the user gets no exclusion even though restroom is unavailable
    // — the user ends up at an unsuitable space. Status is "inquiry" (not excluded) because
    // there is no am_restroom fail check; the unconfirmed dates check prevents "bookable".
    const r = evaluate(noRestroom, electricityOnly);
    expect(r.status).not.toBe("excluded"); // confirms the bug: missing restroom is not caught
    expect(r.checks.find((c) => c.key === "am_restroom")).toBeUndefined(); // no restroom check
  });

  it("both in amenitiesRequired correctly excludes a space missing the restroom", () => {
    const noRestroom = { ...midtownSpace, amenities: ["electricity"], amenities_unavailable: ["restroom"] };
    const r = evaluate(noRestroom, vintageReq()); // correct extraction with both required
    expect(r.checks.find((c) => c.key === "am_restroom")?.result).toBe("fail");
    expect(r.status).toBe("excluded");
  });
});

// ── Bug 4: null array normalization ──────────────────────────────────────────

describe("Bug 4 — null arrays from AI must be normalized before merge into req state", () => {
  /** Mirrors the normalization in match.tsx:runAI before setReq */
  function normalizeAiFields(f: Partial<Requirements>): Partial<Requirements> {
    return {
      ...f,
      amenitiesRequired: Array.isArray(f.amenitiesRequired) ? f.amenitiesRequired : [],
      amenitiesPreferred: Array.isArray(f.amenitiesPreferred) ? f.amenitiesPreferred : [],
      neighborhoods: Array.isArray(f.neighborhoods) ? f.neighborhoods : [],
    };
  }

  it("null amenitiesRequired from model becomes [] after normalization", () => {
    const aiFields = { amenitiesRequired: null as unknown as string[] };
    const normalized = normalizeAiFields(aiFields);
    expect(normalized.amenitiesRequired).toEqual([]);
  });

  it("null amenitiesPreferred from model becomes [] after normalization", () => {
    const aiFields = { amenitiesPreferred: null as unknown as string[] };
    const normalized = normalizeAiFields(aiFields);
    expect(normalized.amenitiesPreferred).toEqual([]);
  });

  it("null neighborhoods from model becomes [] after normalization", () => {
    const aiFields = { neighborhoods: null as unknown as string[] };
    const normalized = normalizeAiFields(aiFields);
    expect(normalized.neighborhoods).toEqual([]);
  });

  it("valid arrays are preserved unchanged by normalization", () => {
    const aiFields: Partial<Requirements> = {
      amenitiesRequired: ["electricity", "restroom"],
      amenitiesPreferred: ["wifi"],
      neighborhoods: ["Midtown"],
    };
    const normalized = normalizeAiFields(aiFields);
    expect(normalized.amenitiesRequired).toEqual(["electricity", "restroom"]);
    expect(normalized.amenitiesPreferred).toEqual(["wifi"]);
    expect(normalized.neighborhoods).toEqual(["Midtown"]);
  });

  it("engine does not crash when amenitiesRequired is [] (normalized from null)", () => {
    const noAmenityReq: Requirements = { ...emptyRequirements(), amenitiesRequired: [] };
    // This would throw "undefined is not iterable" if amenitiesRequired were null
    expect(() => evaluate(midtownSpace, noAmenityReq)).not.toThrow();
  });

  it("merge of normalized AI fields into emptyRequirements produces valid Requirements", () => {
    // Simulate the full merge that happens in match.tsx:runAI
    const aiFields: Partial<Requirements> = {
      maxBudget: 500,
      dailyBudget: null,
      capacity: 20,
      expectedAttendance: 20,
      amenitiesRequired: null as unknown as string[], // model returned null
      amenitiesPreferred: null as unknown as string[], // model returned null
      neighborhoods: ["Midtown"],
      duration: "weekend",
      hasInsurance: "no",
    };
    const normalized = normalizeAiFields(aiFields);
    const merged: Requirements = {
      ...emptyRequirements(),
      ...normalized,
      description: "test",
      alternativeNeighborhoods: [],
      radiusMiles: null,
    } as Requirements;

    // Core assertion: no null arrays in merged state
    expect(Array.isArray(merged.amenitiesRequired)).toBe(true);
    expect(Array.isArray(merged.amenitiesPreferred)).toBe(true);
    expect(Array.isArray(merged.neighborhoods)).toBe(true);
    // Values are correct
    expect(merged.maxBudget).toBe(500);
    expect(merged.capacity).toBe(20);
    expect(merged.hasInsurance).toBe("no");
    // The engine must not throw on this merged state
    expect(() => evaluate(midtownSpace, merged)).not.toThrow();
  });
});

// ── Full end-to-end: correctly extracted vintage clothing requirements ────────

describe("End-to-end: vintage clothing test case with correctly-extracted requirements", () => {
  it("all checks pass for a matching Midtown space with explicit dates", () => {
    // vintageReqWithDates provides startDate/endDate so the dates check can pass
    // and statusFor returns "bookable" (all checks pass + verified_short_term)
    const r = evaluate(midtownSpace, vintageReqWithDates());
    expect(r.status).toBe("bookable");
    expect(r.estimatedCost).toBe(500);
    expect(r.checks.find((c) => c.key === "budget")?.result).toBe("pass");
    expect(r.checks.find((c) => c.key === "capacity")?.result).toBe("pass");
    expect(r.checks.find((c) => c.key === "am_electricity")?.result).toBe("pass");
    expect(r.checks.find((c) => c.key === "am_restroom")?.result).toBe("pass");
  });

  it("without specific dates the space is inquiry (not excluded) — dates check is unknown", () => {
    // AI extracts "a weekend" without calendar dates → startDate null → dates unknown
    const r = evaluate(midtownSpace, vintageReq());
    expect(r.status).toBe("inquiry"); // unknown dates prevent "bookable" but don't exclude
    expect(r.checks.find((c) => c.key === "budget")?.result).toBe("pass");
    expect(r.checks.find((c) => c.key === "am_electricity")?.result).toBe("pass");
    expect(r.checks.find((c) => c.key === "am_restroom")?.result).toBe("pass");
  });

  it("insurance is flagged as outstanding when hasInsurance is 'no'", () => {
    const r = evaluate(midtownSpace, vintageReq());
    expect(r.outstanding.some((o) => o.startsWith("Insurance"))).toBe(true);
  });

  it("a space that costs $600/weekend is excluded at $500 budget", () => {
    const expensive = { ...midtownSpace, price_amount: 300, price_period: "per_day" as const };
    const r = evaluate(expensive, vintageReq());
    expect(r.status).toBe("excluded");
  });

  it("a space that only holds 10 people is excluded at capacity 20", () => {
    const tiny = { ...midtownSpace, capacity: 10 };
    const r = evaluate(tiny, vintageReq());
    expect(r.checks.find((c) => c.key === "capacity")?.result).toBe("fail");
    expect(r.status).toBe("excluded");
  });
});

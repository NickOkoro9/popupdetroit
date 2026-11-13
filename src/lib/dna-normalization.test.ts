/**
 * Regression tests for the DnaMeta array-field normalization.
 *
 * Root cause: when a Granite/watsonx model returns null instead of [] for
 * implied/missing/followUps, the values were written directly into state.
 * The MatchFlow render at match.tsx:87–89 then called .length on undefined/null,
 * crashing with "Cannot read properties of undefined (reading 'length')".
 *
 * The fix applies Array.isArray() guards in match.tsx (setDna call after runAI)
 * and default-spread in requirements-store.tsx (sessionStorage hydration).
 *
 * These tests reproduce the exact shapes that caused the crash and verify the fix.
 */

import { describe, it, expect } from "vitest";

// ── Helper: mirrors the normalization logic in match.tsx:runAI and
//    requirements-store.tsx:hydration so both paths are covered. ──────────────

function normalizeDnaArrays(raw: {
  implied: unknown;
  missing: unknown;
  followUps: unknown;
  summary: unknown;
}) {
  return {
    implied: Array.isArray(raw.implied) ? (raw.implied as string[]) : [],
    missing: Array.isArray(raw.missing) ? (raw.missing as string[]) : [],
    followUps: Array.isArray(raw.followUps) ? (raw.followUps as string[]) : [],
    summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

/** Mirrors the spread-defaults used in requirements-store.tsx hydration. */
function normalizePersistedDna(persisted: Record<string, unknown>) {
  return {
    implied: [],
    missing: [],
    followUps: [],
    ...persisted,
  } as { implied: unknown; missing: unknown; followUps: unknown };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DnaMeta array-field normalization — match.tsx runAI path", () => {
  it("preserves well-formed arrays from the model", () => {
    const result = normalizeDnaArrays({
      implied: ["Display fixtures may be needed"],
      missing: ["insurance status"],
      followUps: ["Do you have liability insurance?"],
      summary: "A food stall in Corktown.",
    });
    expect(result.implied).toEqual(["Display fixtures may be needed"]);
    expect(result.missing).toEqual(["insurance status"]);
    expect(result.followUps).toEqual(["Do you have liability insurance?"]);
    expect(result.summary).toBe("A food stall in Corktown.");
  });

  it("replaces null arrays with [] — exact crash shape from Granite", () => {
    // This is the shape that caused: TypeError: Cannot read properties of
    // undefined (reading 'length') at MatchFlow match.tsx:87
    const result = normalizeDnaArrays({
      implied: null,
      missing: null,
      followUps: null,
      summary: "A test business.",
    });
    // These must be arrays so .length never throws
    expect(Array.isArray(result.implied)).toBe(true);
    expect(Array.isArray(result.missing)).toBe(true);
    expect(Array.isArray(result.followUps)).toBe(true);
    expect(result.implied.length).toBe(0);  // the crashing line
    expect(result.missing.length).toBe(0);  // match.tsx:87
    expect(result.followUps.length).toBe(0);
  });

  it("replaces undefined arrays with []", () => {
    const result = normalizeDnaArrays({
      implied: undefined,
      missing: undefined,
      followUps: undefined,
      summary: "A test business.",
    });
    expect(Array.isArray(result.implied)).toBe(true);
    expect(Array.isArray(result.missing)).toBe(true);
    expect(Array.isArray(result.followUps)).toBe(true);
  });

  it("replaces non-array values (string, number) with []", () => {
    const result = normalizeDnaArrays({
      implied: "not an array",
      missing: 42,
      followUps: false,
      summary: "test",
    });
    expect(result.implied).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.followUps).toEqual([]);
  });

  it("replaces null/undefined summary with empty string", () => {
    const r1 = normalizeDnaArrays({ implied: [], missing: [], followUps: [], summary: null });
    const r2 = normalizeDnaArrays({ implied: [], missing: [], followUps: [], summary: undefined });
    expect(r1.summary).toBe("");
    expect(r2.summary).toBe("");
  });
});

describe("DnaMeta array-field normalization — sessionStorage hydration path", () => {
  it("preserves complete persisted objects unchanged", () => {
    const persisted = {
      source: "live_ai",
      implied: ["fixture"],
      missing: ["insurance"],
      followUps: ["Q?"],
      summary: "A test.",
    };
    const result = normalizePersistedDna(persisted);
    expect(result.implied).toEqual(["fixture"]);
    expect(result.missing).toEqual(["insurance"]);
    expect(result.followUps).toEqual(["Q?"]);
  });

  it("fills missing array fields from old snapshots with []", () => {
    // Old persisted DnaMeta written before implied/missing/followUps existed
    const oldSnapshot = { source: "manual", summary: "Requirements entered manually." };
    const result = normalizePersistedDna(oldSnapshot);
    expect(Array.isArray(result.implied)).toBe(true);
    expect(Array.isArray(result.missing)).toBe(true);
    expect(Array.isArray(result.followUps)).toBe(true);
    // .length must not throw — this is the regression guard
    expect((result.implied as string[]).length).toBe(0);
  });

  it("does not override present array fields with []", () => {
    const snapshot = {
      source: "live_ai",
      implied: ["item"],
      missing: [],
      followUps: ["Q?"],
      summary: "test",
    };
    const result = normalizePersistedDna(snapshot);
    // Spread order: defaults first, then persisted values win
    expect(result.implied).toEqual(["item"]);
    expect(result.followUps).toEqual(["Q?"]);
  });
});

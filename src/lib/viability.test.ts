import { expect, it } from "vitest";
import { computeViability } from "./viability";
it("break-even = fixed costs / margin", () => {
  const r = computeViability({ sales: 2000, rent: 500, marginPct: 50, staffing: 300, marketing: 100, other: 100 });
  expect(r.fixed).toBe(1000);
  expect(r.contribution).toBe(0);
  expect(r.breakEvenSales).toBe(2000);
});

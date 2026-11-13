// Viability Lab arithmetic — deterministic, transparent formulas.
export interface ViabilityInput { sales: number; rent: number; marginPct: number; staffing: number; marketing: number; other: number }
export function computeViability(i: ViabilityInput) {
  const fixed = i.rent + i.staffing + i.marketing + i.other;
  const grossProfit = i.sales * (i.marginPct / 100);
  const contribution = grossProfit - fixed;
  const breakEvenSales = i.marginPct > 0 ? fixed / (i.marginPct / 100) : null;
  return { fixed, grossProfit, contribution, breakEvenSales };
}

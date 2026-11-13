import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NumField } from "@/components/pd/fields";
import { computeViability, type ViabilityInput } from "@/lib/viability";

export const Route = createFileRoute("/viability")({
  head: () => ({
    meta: [
      { title: "Viability Lab — PopUp Detroit" },
      { name: "description", content: "Estimate costs, contribution and break-even sales for a pop-up with transparent formulas." },
      { property: "og:title", content: "Viability Lab — PopUp Detroit" },
      { property: "og:description", content: "Pop-up break-even calculator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Viability,
});

const $ = (n: number | null) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);
const SCEN = [{ k: "Cautious", f: 0.6 }, { k: "Expected", f: 1 }, { k: "Strong", f: 1.4 }];

function Viability() {
  const [i, setI] = useState<ViabilityInput>({ sales: 2500, rent: 500, marginPct: 55, staffing: 300, marketing: 150, other: 100 });
  const up = (k: keyof ViabilityInput) => (v: number | null) => setI((s) => ({ ...s, [k]: v ?? 0 }));
  const r = computeViability(i);
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="eyebrow">Viability Lab</p>
      <h1 className="mt-2 text-4xl">Will the weekend pay off?</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Hypothetical estimates from your own numbers — not a forecast or guarantee.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <NumField label="Expected sales" prefix="$" value={i.sales} onChange={up("sales")} />
          <NumField label="Rental cost" prefix="$" value={i.rent} onChange={up("rent")} />
          <NumField label="Gross profit margin (%)" value={i.marginPct} onChange={up("marginPct")} />
          <NumField label="Staffing" prefix="$" value={i.staffing} onChange={up("staffing")} />
          <NumField label="Marketing" prefix="$" value={i.marketing} onChange={up("marketing")} />
          <NumField label="Other operating costs" prefix="$" value={i.other} onChange={up("other")} />
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[["Total costs", r.fixed], ["Contribution", r.contribution], ["Break-even sales", r.breakEvenSales]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl border border-border bg-card p-4"><p className="eyebrow">{k}</p><p className={`mt-2 font-display text-3xl ${typeof v === "number" && v < 0 ? "text-destructive" : ""}`}>{$(v as number | null)}</p></div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="eyebrow">Scenarios (sales ×0.6 / ×1 / ×1.4)</p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th className="py-1 font-normal">Scenario</th><th className="font-normal">Sales</th><th className="font-normal">Contribution</th></tr></thead>
              <tbody>{SCEN.map((s) => { const x = computeViability({ ...i, sales: i.sales * s.f }); return (
                <tr key={s.k} className="border-t border-border"><td className="py-2">{s.k}</td><td>{$(i.sales * s.f)}</td><td className={x.contribution < 0 ? "text-destructive" : ""}>{$(x.contribution)}</td></tr>); })}</tbody>
            </table>
          </div>
          <div className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Formulas</p>
            <p className="mt-2">Total costs = rent + staffing + marketing + other</p>
            <p>Contribution = sales × margin − total costs</p>
            <p>Break-even sales = total costs ÷ margin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

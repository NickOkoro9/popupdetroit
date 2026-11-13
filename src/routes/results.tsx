import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Chips, NumField } from "@/components/pd/fields";
import { PropertyCard } from "@/components/pd/PropertyCard";
import { PropertyMap } from "@/components/pd/PropertyMap";
import { propertiesQuery } from "@/lib/properties-query";
import { useRequirements } from "@/lib/requirements-store";
import { rank, WEIGHTS } from "@/lib/matching/engine";
import { AMENITIES, DURATIONS, NEIGHBORHOODS } from "@/lib/matching/types";
import { STATUS_META } from "@/lib/format";
import { explainResults } from "@/lib/api.functions";

export const Route = createFileRoute("/results")({
  loader: ({ context }) => context.queryClient.ensureQueryData(propertiesQuery),
  head: () => ({
    meta: [
      { title: "Your matches — PopUp Detroit" },
      { name: "description", content: "Real Detroit commercial listings screened against your requirements and ranked with an explainable score." },
      { property: "og:title", content: "Explore Detroit spaces — PopUp Detroit" },
      { property: "og:description", content: "Map-based, source-linked commercial space discovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Results,
});

function Results() {
  const { data: properties } = useSuspenseQuery(propertiesQuery);
  const { req, setReq } = useRequirements();
  const [selected, setSelected] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [hoodFilter, setHoodFilter] = useState<string[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const explain = useServerFn(explainResults);

  const results = useMemo(() => rank(properties, req), [properties, req]);
  const byId = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);
  const visible = results.filter((m) => {
    const p = byId.get(m.propertyId)!;
    if (!showExcluded && m.status === "excluded") return false;
    if (statusFilter.length && !statusFilter.includes(p.verification_status)) return false;
    if (hoodFilter.length && !hoodFilter.includes(p.neighborhood ?? "")) return false;
    return true;
  });
  const visibleProps = visible.map((m) => byId.get(m.propertyId)!);
  const counts = { bookable: results.filter((r) => r.status === "bookable").length, inquiry: results.filter((r) => r.status === "inquiry").length, excluded: results.filter((r) => r.status === "excluded").length };

  const onSelect = useCallback((id: string) => {
    setSelected(id);
    document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const runExplain = async () => {
    setExplaining(true); setExplainError(null);
    const top = results.filter((r) => r.status !== "excluded").slice(0, 6);
    const items = (top.length ? top : results.slice(0, 6)).map((m) => {
      const p = byId.get(m.propertyId)!;
      return { id: p.id, facts: { name: p.name, neighborhood: p.neighborhood, verification: p.verification_status, short_term_confirmed: p.short_term_confirmed, price_notes: p.price_notes, available_notes: p.available_notes, amenities_listed: p.amenities, status: m.status, checks: m.checks.map((c) => ({ label: c.label, result: c.result, detail: c.detail })) } };
    });
    try {
      const res = await explain({ data: { requirements: { category: req.category, neighborhoods: req.neighborhoods, maxBudget: req.maxBudget, duration: req.duration, capacity: req.capacity, amenitiesRequired: req.amenitiesRequired, hasInsurance: req.hasInsurance }, items } });
      if (res.ok) setExplanations(Object.fromEntries(res.explanations.map((e) => [e.id, e.text])));
      else setExplainError(res.error);
    } catch { setExplainError("AI explanations are unavailable right now. Scores and checks above are unaffected."); }
    finally { setExplaining(false); }
  };

  if (!properties.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl">No property records yet</h1>
        <p className="mt-4 text-muted-foreground">PopUp Detroit only shows real, source-linked properties. Real inventory must be imported before matches can be shown — nothing fictional is substituted.</p>
        <Button asChild className="mt-6"><Link to="/admin/import">Import property data</Link></Button>
      </div>
    );
  }

  const hasReq = req.category || req.maxBudget != null || req.neighborhoods.length > 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Opportunity Engine</p>
          <h1 className="mt-1 text-4xl">{hasReq ? "Your matches" : "Explore Detroit spaces"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {properties.length} real listings · {counts.bookable} bookable · {counts.inquiry} inquiry opportunities · {counts.excluded} not eligible
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to="/match">Edit all requirements</Link></Button>
          <Button onClick={runExplain} disabled={explaining}>{explaining ? <Loader2 className="animate-spin" /> : <Sparkles />}Explain results with AI</Button>
        </div>
      </div>
      {!hasReq && <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm text-warn">No requirements yet — scores reflect neutral defaults. <Link to="/match" className="underline">Describe your business</Link> for real matching.</p>}
      {explainError && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{explainError}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <p className="eyebrow">Quick adjust</p>
            <NumField label="Max total budget" prefix="$" value={req.maxBudget} onChange={(v) => setReq((p) => ({ ...p, maxBudget: v }))} />
            <NumField label="Capacity needed" value={req.capacity} onChange={(v) => setReq((p) => ({ ...p, capacity: v }))} />
            <div className="space-y-1.5"><p className="text-sm font-medium">Duration</p>
              <Chips options={DURATIONS} value={req.duration ? [req.duration] : []} onChange={(v) => setReq((p) => ({ ...p, duration: v.at(-1) ?? null }))} /></div>
            <div className="space-y-1.5"><p className="text-sm font-medium">Required amenities</p>
              <Chips options={AMENITIES} value={req.amenitiesRequired} onChange={(v) => setReq((p) => ({ ...p, amenitiesRequired: v }))} /></div>
            <div className="space-y-1.5"><p className="text-sm font-medium">Preferred neighborhoods</p>
              <Chips options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))} value={req.neighborhoods} onChange={(v) => setReq((p) => ({ ...p, neighborhoods: v }))} /></div>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <p className="eyebrow">Filter</p>
            <Chips options={Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))} value={statusFilter} onChange={setStatusFilter} />
            <Chips options={[...new Set(properties.map((p) => p.neighborhood).filter(Boolean))].map((n) => ({ value: n!, label: n! }))} value={hoodFilter} onChange={setHoodFilter} />
            <label className="flex items-center justify-between text-sm">Show ineligible <Switch checked={showExcluded} onCheckedChange={setShowExcluded} /></label>
          </div>
          <details className="rounded-xl border border-border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">How scores work</summary>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {Object.entries(WEIGHTS).map(([k, w]) => <li key={k} className="flex justify-between capitalize"><span>{k}</span><span>{w * 100}%</span></li>)}
            </ul>
            <p className="mt-3 text-muted-foreground">Hard rules run first: confirmed conflicts exclude a space; unknown facts are never counted as a match. A high score is not availability or legal approval.</p>
          </details>
        </aside>

        <div className="space-y-4">
          {visible.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">No spaces match these filters.</p>}
          {visible.map((m) => (
            <PropertyCard key={m.propertyId} p={byId.get(m.propertyId)!} match={m} selected={selected === m.propertyId} onHover={() => setSelected(m.propertyId)} explanation={explanations[m.propertyId]} />
          ))}
        </div>

        <div className="order-first lg:order-none">
          <div className="lg:sticky lg:top-20">
            <PropertyMap properties={visibleProps} selectedId={selected} onSelect={onSelect} className="h-[360px] w-full overflow-hidden rounded-xl border border-border lg:h-[calc(100vh-7rem)]" />
            <p className="mt-2 text-xs text-muted-foreground">Every pin is a real listing. Locations are geocoded from street addresses via OpenStreetMap.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

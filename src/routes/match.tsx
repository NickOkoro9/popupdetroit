import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Chips, Field, NumField, TextField, Tri } from "@/components/pd/fields";
import { extractBusinessDNA } from "@/lib/api.functions";
import { useRequirements } from "@/lib/requirements-store";
import { AMENITIES, CATEGORIES, DURATIONS, NEIGHBORHOODS, REGULATED, emptyRequirements, type Requirements } from "@/lib/matching/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/match")({
  validateSearch: z.object({ auto: z.number().optional() }),
  head: () => ({
    meta: [
      { title: "Describe your business — PopUp Detroit" },
      { name: "description", content: "Tell us what you're building. Business DNA turns your description into editable requirements." },
      { property: "og:title", content: "Describe your business — PopUp Detroit" },
      { property: "og:description", content: "AI-powered requirement extraction for Detroit pop-ups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MatchFlow,
});

const STEPS = ["Describe", "Business", "Location", "Budget & timing", "Space", "Activities & documents"];
const nb = NEIGHBORHOODS.map((n) => ({ value: n, label: n }));

function MatchFlow() {
  const { req, setReq, dna, setDna, hydrated } = useRequirements();
  const { auto } = Route.useSearch();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const extract = useServerFn(extractBusinessDNA);
  const navigate = useNavigate();
  const ran = useRef(false);
  const up = (patch: Partial<Requirements>) => setReq((p) => ({ ...p, ...patch }));

  const runAI = async () => {
    if (req.description.trim().length < 10) { toast.error("Please describe your business in a sentence or two."); return; }
    setLoading(true); setAiError(null);
    try {
      const res = await extract({ data: { description: req.description } });
      if (!res.ok) { setAiError(res.error); return; }
      const f = res.result.fields;
      // Normalize array fields from the AI response: a model may return null instead of []
      // for amenitiesRequired / amenitiesPreferred / neighborhoods even though the schema
      // marks them as arrays. Null would override emptyRequirements()'s [] in the spread
      // and later crash the engine's `for (const a of r.amenitiesRequired)` loop.
      const normalizedF: Partial<Requirements> = {
        ...f,
        amenitiesRequired: Array.isArray(f.amenitiesRequired) ? f.amenitiesRequired : [],
        amenitiesPreferred: Array.isArray(f.amenitiesPreferred) ? f.amenitiesPreferred : [],
        neighborhoods: Array.isArray(f.neighborhoods) ? f.neighborhoods : [],
      };
      setReq((p) => ({ ...emptyRequirements(), ...normalizedF, description: p.description, alternativeNeighborhoods: [], radiusMiles: null } as Requirements));
      // Guard against a model returning null instead of [] for array fields (Granite / watsonx
      // honour the JSON schema structurally but may still emit null on sparse outputs).
      setDna({
        source: "live_ai",
        provider: res.provider,
        implied: Array.isArray(res.result.implied) ? res.result.implied : [],
        missing: Array.isArray(res.result.missing) ? res.result.missing : [],
        followUps: Array.isArray(res.result.followUps) ? res.result.followUps : [],
        summary: res.result.summary ?? "",
      });
      setStep(1);
    } catch {
      setAiError("Couldn't reach the AI service. You can still fill in the form manually.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (hydrated && auto && !ran.current && !dna && req.description.length >= 10) { ran.current = true; void runAI(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, auto]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <ol className="flex flex-wrap gap-x-1 gap-y-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button onClick={() => setStep(i)} className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs", i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
              <span>{i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3 h-1 rounded bg-muted"><div className="h-1 rounded bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      {dna && step > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Business DNA</p>
            <span className="rounded-full bg-status-verified-bg px-2.5 py-0.5 text-xs text-status-verified">
              {dna.source === "live_ai" ? `Extracted by live AI · ${dna.provider?.model}` : "Entered manually"}
            </span>
          </div>
          <p className="mt-2">{dna.summary}</p>
          {dna.missing.length > 0 && <p className="mt-3 text-sm text-warn"><b>Missing:</b> {dna.missing.join(" · ")}</p>}
          {dna.implied.length > 0 && <p className="mt-1 text-sm text-muted-foreground"><b>Possibly relevant (unconfirmed):</b> {dna.implied.join(" · ")}</p>}
          {dna.followUps.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{dna.followUps.map((q) => <li key={q}>{q}</li>)}</ul>}
          <p className="mt-3 text-xs text-muted-foreground">Every field below is editable. "Not specified" is never treated as "no".</p>
        </div>
      )}

      <section className="mt-8 space-y-6">
        {step === 0 && (
          <>
            <h1 className="text-4xl">What are you building?</h1>
            <p className="text-muted-foreground">Describe it naturally. Our AI extracts structured requirements you can review — or skip straight to the form.</p>
            <Textarea rows={6} value={req.description} onChange={(e) => up({ description: e.target.value })}
              placeholder="I'm launching a vintage clothing brand. I want a space in Midtown Detroit for a weekend. My total budget is $500. I need electricity, a restroom, and enough capacity for 20 customers. I don't currently have business liability insurance." />
            {aiError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{aiError} No requirements were invented — you can fill the form manually.</p>}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={runAI} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Sparkles />}{loading ? "Reading your description…" : "Extract Business DNA"}</Button>
              <Button size="lg" variant="outline" onClick={() => { setDna({ source: "manual", implied: [], missing: [], followUps: [], summary: "Requirements entered manually." }); setStep(1); }}>Fill in manually</Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-3xl">Business profile</h2>
            <TextField label="Business name (optional)" value={req.businessName} onChange={(v) => up({ businessName: v })} />
            <Field label="Category">
              <Chips options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={req.category ? [req.category] : []} onChange={(v) => up({ category: v.at(-1) ?? null })} />
            </Field>
            <TextField label="Intended activities" value={req.activities} onChange={(v) => up({ activities: v })} placeholder="e.g. selling racks of vintage clothing, try-ons" />
            <NumField label="Expected customer attendance" value={req.expectedAttendance} onChange={(v) => up({ expectedAttendance: v })} />
            <div className="divide-y divide-border rounded-lg border border-border px-4">
              <Tri label="Already operates a physical location" value={req.operatesPhysically} onChange={(v) => up({ operatesPhysically: v })} />
              <Tri label="Wants recurring space (vs. one-time)" value={req.recurring} onChange={(v) => up({ recurring: v })} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-3xl">Location</h2>
            <Field label="Preferred neighborhoods"><Chips options={nb} value={req.neighborhoods} onChange={(v) => up({ neighborhoods: v })} /></Field>
            <Field label="Alternative neighborhoods"><Chips options={nb} value={req.alternativeNeighborhoods} onChange={(v) => up({ alternativeNeighborhoods: v })} /></Field>
            <NumField label="Acceptable travel radius (miles)" value={req.radiusMiles} onChange={(v) => up({ radiusMiles: v })} />
            <div className="rounded-lg border border-border px-4"><Tri label="Flexible on location" value={req.locationFlexible} onChange={(v) => up({ locationFlexible: v })} /></div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-3xl">Budget & timing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Maximum total budget" prefix="$" value={req.maxBudget} onChange={(v) => up({ maxBudget: v })} hint="Treated as a strict limit." />
              <NumField label="Preferred daily budget" prefix="$" value={req.dailyBudget} onChange={(v) => up({ dailyBudget: v })} />
              <Field label="Start date"><Input type="date" value={req.startDate ?? ""} onChange={(e) => up({ startDate: e.target.value || null })} /></Field>
              <Field label="End date"><Input type="date" value={req.endDate ?? ""} onChange={(e) => up({ endDate: e.target.value || null })} /></Field>
            </div>
            <Field label="Preferred duration">
              <Chips options={DURATIONS} value={req.duration ? [req.duration] : []} onChange={(v) => up({ duration: v.at(-1) ?? null })} />
            </Field>
            <div className="divide-y divide-border rounded-lg border border-border px-4">
              <Tri label="Dates are flexible" value={req.datesFlexible} onChange={(v) => up({ datesFlexible: v })} />
              <Tri label="Interested in recurring rentals" value={req.recurring} onChange={(v) => up({ recurring: v })} />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-3xl">Space requirements</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Minimum square footage" value={req.minSqft} onChange={(v) => up({ minSqft: v })} />
              <NumField label="Customer capacity needed" value={req.capacity} onChange={(v) => up({ capacity: v })} />
            </div>
            <Field label="Required amenities" hint="Spaces that confirm these are missing are excluded.">
              <Chips options={AMENITIES} value={req.amenitiesRequired} onChange={(v) => up({ amenitiesRequired: v, amenitiesPreferred: req.amenitiesPreferred.filter((a) => !v.includes(a)) })} />
            </Field>
            <Field label="Preferred amenities" hint="Improve the score but never exclude a space.">
              <Chips options={AMENITIES.filter((a) => !req.amenitiesRequired.includes(a.value))} value={req.amenitiesPreferred} onChange={(v) => up({ amenitiesPreferred: v })} />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-3xl">Activities & documents</h2>
            <div className="divide-y divide-border rounded-lg border border-border px-4">
              {REGULATED.map((r) => (
                <Tri key={r.value} label={r.label} value={req.regulated[r.value]} onChange={(v) => up({ regulated: { ...req.regulated, [r.value]: v } })} />
              ))}
            </div>
            <TextField label="Expected operating hours" value={req.operatingHours} onChange={(v) => up({ operatingHours: v })} placeholder="e.g. Sat–Sun 11am–6pm" />
            <div className="divide-y divide-border rounded-lg border border-border px-4">
              <Tri label="Business liability insurance" value={req.hasInsurance} onChange={(v) => up({ hasInsurance: v })} />
              <Tri label="Relevant business licenses" value={req.hasLicenses} onChange={(v) => up({ hasLicenses: v })} />
              <Tri label="Relevant permits" value={req.hasPermits} onChange={(v) => up({ hasPermits: v })} />
            </div>
            <div className="rounded-lg bg-warn-bg p-4 text-sm text-warn">
              Three separate things apply: <b>(1)</b> what the landlord requires (often insurance), <b>(2)</b> licenses for your business type, and <b>(3)</b> City of Detroit zoning, building and safety rules. Not having a document doesn't mean you're exempt. PopUp Detroit never declares a space legally suitable.
            </div>
          </>
        )}
      </section>

      {step > 0 && (
        <div className="mt-10 flex justify-between gap-3">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < STEPS.length - 1
            ? <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
            : <Button size="lg" onClick={() => navigate({ to: "/results" })}>See my matches</Button>}
        </div>
      )}
    </div>
  );
}

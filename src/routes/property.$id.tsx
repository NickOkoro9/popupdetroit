import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, ExternalLink, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NumField } from "@/components/pd/fields";
import { StatusBadge, MatchStatusPill } from "@/components/pd/StatusBadge";
import { PhotoPlaceholder } from "@/components/pd/PhotoPlaceholder";
import { PropertyMap } from "@/components/pd/PropertyMap";
import { propertyQuery } from "@/lib/properties-query";
import { useRequirements } from "@/lib/requirements-store";
import { evaluate } from "@/lib/matching/engine";
import { AMENITIES } from "@/lib/matching/types";
import { ctaFor, fmtDate, priceLabel, sqftLabel, STATUS_META } from "@/lib/format";
import { draftFlexLease, submitInquiry } from "@/lib/api.functions";

export const Route = createFileRoute("/property/$id")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(propertyQuery(params.id));
    if (!p) throw notFound();
    return { name: p.name, neighborhood: p.neighborhood };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Property"} — PopUp Detroit` },
      { name: "description", content: `Source-linked commercial listing in ${loaderData?.neighborhood ?? "Detroit"}, with match explanation and flexible-lease options.` },
      { property: "og:title", content: `${loaderData?.name ?? "Property"} — PopUp Detroit` },
      { property: "og:description", content: `Commercial space in ${loaderData?.neighborhood ?? "Detroit"}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: () => <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-3xl">Property not found</h1><Link to="/results" className="mt-4 inline-block text-primary underline">Back to results</Link></div>,
  component: PropertyPage,
});

const Icon = ({ r }: { r: string }) => r === "pass" ? <CheckCircle2 className="size-4 text-status-verified" /> : r === "fail" ? <XCircle className="size-4 text-destructive" /> : <CircleHelp className="size-4 text-warn" />;

function PropertyPage() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(propertyQuery(id));
  const { req } = useRequirements();
  const match = useMemo(() => (p ? evaluate(p, req) : null), [p, req]);
  if (!p || !match) return null;
  const cta = ctaFor(p.verification_status);
  const ams = (list: string[]) => list.map((a) => AMENITIES.find((x) => x.value === a)?.label ?? a).join(", ");

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link to="/results" className="text-sm text-muted-foreground hover:text-foreground">← All results</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap gap-2"><StatusBadge status={p.verification_status} /><MatchStatusPill status={match.status} /></div>
          <h1 className="mt-3 text-4xl md:text-5xl">{p.name}</h1>
          <p className="mt-2 text-muted-foreground">{p.address} · {p.neighborhood ?? "Neighborhood unknown"}</p>
          {p.photo_url ? <img src={p.photo_url} alt={p.name} className="mt-6 aspect-video w-full rounded-xl object-cover" /> : <PhotoPlaceholder className="mt-6 aspect-video w-full rounded-xl" />}
          {p.description && <p className="mt-6 text-lg leading-relaxed">{p.description}</p>}

          <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              ["Published pricing", priceLabel(p)],
              ["Pricing notes", p.price_notes ?? "—"],
              ["Size", sqftLabel(p)],
              ["Capacity", p.capacity != null ? `${p.capacity} people` : "Not listed"],
              ["Property type", p.property_type ?? "Not listed"],
              ["Availability", p.short_term_confirmed ? `Confirmed ${p.available_from ? fmtDate(p.available_from) : ""}${p.available_to ? ` – ${fmtDate(p.available_to)}` : ""}` : "Availability not confirmed"],
              ["Availability notes", p.available_notes ?? "—"],
              ["Minimum rental", p.min_duration_days != null ? `${p.min_duration_days} day(s)` : "Not stated"],
              ["Amenities listed", p.amenities.length ? ams(p.amenities) : "None stated by source"],
              ["Suitable uses (per source)", p.permitted_uses.join(", ") || "Not stated"],
              ["Prohibited uses", p.prohibited_uses.join(", ") || "None stated"],
              ["Landlord requirements", p.landlord_requirements.join("; ") || "Not stated — ask about insurance and deposits"],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-border pt-3"><dt className="eyebrow">{k}</dt><dd className="mt-1 text-sm">{v}</dd></div>
            ))}
          </dl>

          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
            <p className="eyebrow">Source attribution</p>
            <p className="mt-2">{STATUS_META[p.verification_status]?.desc}</p>
            <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary underline">{p.source_name} <ExternalLink className="size-3" /></a>
            <p className="mt-1 text-muted-foreground">Last checked {fmtDate(p.last_verified)}. Listing details can change; confirm with the source.</p>
          </div>

          <PropertyMap properties={[p]} selectedId={p.id} className="mt-8 h-72 w-full overflow-hidden rounded-xl border border-border" />
          {p.coord_precision === "approximate" && <p className="mt-2 text-xs text-muted-foreground">Pin location is approximate.</p>}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-end justify-between">
              <div><p className="eyebrow">Compatibility</p><p className="font-display text-5xl">{match.score}<span className="text-xl text-muted-foreground">/100</span></p></div>
              <div className="text-right"><p className="eyebrow">Info completeness</p><p className="font-display text-2xl">{match.completeness}%</p></div>
            </div>
            <div className="mt-4 space-y-2">
              {match.components.map((c) => (
                <div key={c.key} className="text-sm">
                  <div className="flex justify-between"><span>{c.label} <span className="text-muted-foreground">({c.weight * 100}%)</span></span><span>{c.points}</span></div>
                  <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${c.value * 100}%` }} /></div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.reason}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">A high score does not mean the space is available or legally approved.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="eyebrow">Eligibility checks</p>
            <ul className="mt-3 space-y-2">
              {match.checks.map((c) => (
                <li key={c.key} className="flex gap-2 text-sm"><Icon r={c.result} /><div><b className="font-medium">{c.label}.</b> <span className="text-muted-foreground">{c.detail}</span></div></li>
              ))}
            </ul>
            {match.outstanding.length > 0 && (
              <>
                <p className="eyebrow mt-5">Outstanding questions</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{match.outstanding.map((o) => <li key={o}>{o}</li>)}</ul>
              </>
            )}
          </div>

          <InquiryForm propertyId={p.id} propertyName={p.name} cta={cta} priceNotes={p.price_notes} match={match} />
        </aside>
      </div>
    </div>
  );
}

function InquiryForm({ propertyId, propertyName, cta, priceNotes, match }: { propertyId: string; propertyName: string; cta: ReturnType<typeof ctaFor>; priceNotes: string | null; match: ReturnType<typeof evaluate> }) {
  const { req } = useRequirements();
  const [f, setF] = useState({
    name: "", email: "", start: req.startDate ?? "", end: req.endDate ?? "", budget: req.maxBudget, attendance: req.capacity ?? req.expectedAttendance,
    use: [req.category, req.activities].filter(Boolean).join(" — "), message: "",
  });
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; created_at: string; inquiry_type: string } | null>(null);
  const draft = useServerFn(draftFlexLease);
  const submit = useServerFn(submitInquiry);

  const runDraft = async () => {
    setDrafting(true);
    try {
      const res = await draft({ data: {
        property: { name: propertyName, confirmed_listing_terms: priceNotes, short_term_confirmed: match.status === "bookable" },
        entrepreneur_proposed_terms: { start: f.start || null, end: f.end || null, budget: f.budget, attendance: f.attendance, intended_use: f.use, required_amenities: req.amenitiesRequired },
        business_description: req.description || null,
        request_type: cta.label,
      } });
      if (res.ok) { setF((s) => ({ ...s, message: res.message })); setAssumptions(res.assumptions); }
      else toast.error(res.error);
    } catch { toast.error("AI drafting is unavailable right now. You can write the message yourself."); }
    finally { setDrafting(false); }
  };

  const send = async () => {
    setSaving(true);
    try {
      const res = await submit({ data: {
        propertyId, inquiryType: cta.type, contactName: f.name, contactEmail: f.email,
        proposedStart: f.start || null, proposedEnd: f.end || null, proposedBudget: f.budget, expectedAttendance: f.attendance,
        intendedUse: f.use || null, message: f.message, requirements: req, matchSnapshot: { score: match.score, status: match.status, checks: match.checks },
      } });
      if (res.ok) setSaved(res.inquiry); else toast.error(res.error);
    } catch { toast.error("Please check the form: name, a valid email and a message of at least 10 characters are required."); }
    finally { setSaving(false); }
  };

  if (saved) {
    return (
      <div className="rounded-xl border border-primary bg-card p-5">
        <p className="eyebrow">Inquiry saved</p>
        <p className="mt-2 font-display text-2xl">Saved — not yet sent</p>
        <p className="mt-2 text-sm text-muted-foreground">Your {saved.inquiry_type.replace(/_/g, " ")} was stored (reference {saved.id.slice(0, 8)}). Email delivery to owners isn't configured yet, so <b>nobody has been contacted</b> and this is <b>not a booking</b>. Contact the listing source directly to proceed.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="eyebrow">{cta.type === "flexible_lease" ? "FlexLease proposal" : cta.label}</p>
      <h3 className="mt-1 text-2xl">{cta.label}</h3>
      {cta.type !== "request_to_book" && <p className="mt-1 text-xs text-muted-foreground">This owner hasn't confirmed short-term terms. Your message is a proposal only.</p>}
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Start"><Input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="End"><Input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
          <NumField label="Proposed budget" prefix="$" value={f.budget} onChange={(v) => setF({ ...f, budget: v })} />
          <NumField label="Attendance" value={f.attendance} onChange={(v) => setF({ ...f, attendance: v })} />
        </div>
        <Field label="Intended use"><Input value={f.use} onChange={(e) => setF({ ...f, use: e.target.value })} /></Field>
        <Field label="Message to the owner">
          <Textarea rows={7} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Introduce your business and proposed terms…" />
        </Field>
        {assumptions.length > 0 && <div className="rounded-lg bg-warn-bg p-3 text-xs text-warn"><b>Unverified assumptions in this draft:</b> {assumptions.join(" · ")}</div>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={runDraft} disabled={drafting}>{drafting ? <Loader2 className="animate-spin" /> : <Sparkles />}Draft with AI</Button>
          <Button onClick={send} disabled={saving}>{saving && <Loader2 className="animate-spin" />}Submit {cta.type === "request_to_book" ? "request" : "inquiry"}</Button>
        </div>
      </div>
    </div>
  );
}

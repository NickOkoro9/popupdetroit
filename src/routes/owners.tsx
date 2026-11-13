import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Chips, Field, NumField, TextField, Tri } from "@/components/pd/fields";
import { AMENITIES, NEIGHBORHOODS, type TriState } from "@/lib/matching/types";
import { submitOwnerProperty } from "@/lib/api.functions";

export const Route = createFileRoute("/owners")({
  head: () => ({
    meta: [
      { title: "List your property — PopUp Detroit" },
      { name: "description", content: "Property owners and authorized managers can submit underused Detroit commercial space for short-term use." },
      { property: "og:title", content: "List your property — PopUp Detroit" },
      { property: "og:description", content: "Activate underused commercial space with short-term occupancy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Owners,
});

function Owners() {
  const [f, setF] = useState({
    name: "", address: "", neighborhood: null as string | null, propertyType: null as string | null, sqft: null as number | null, capacity: null as number | null,
    amenities: [] as string[], permittedUses: null as string | null, prohibitedUses: null as string | null, availableDates: null as string | null,
    price: null as number | null, pricePeriod: "per_day", minDurationDays: null as number | null, insuranceRequirements: null as string | null,
    otherRequirements: null as string | null, flexibleLeasing: "unknown" as TriState, contactName: "", contactEmail: "", authorized: false,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const submit = useServerFn(submitOwnerProperty);
  const up = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  const send = async () => {
    if (!f.authorized) { toast.error("Please confirm you are authorized to list this property."); return; }
    setBusy(true);
    try {
      const { contactName, contactEmail, authorized: _a, ...rest } = f;
      const res = await submit({ data: { contactName, contactEmail, payload: { ...rest, authorizedToList: true } } });
      if (res.ok) setDone(res.submission.id); else toast.error(res.error);
    } catch { toast.error("Please complete the property name, address, your name and a valid email."); }
    finally { setBusy(false); }
  };

  if (done) return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="eyebrow">Submission received</p>
      <h1 className="mt-3 text-4xl">Pending review</h1>
      <p className="mt-4 text-muted-foreground">Reference {done.slice(0, 8)}. Your property is not public yet. It will be reviewed before appearing, and won't be marked verified until short-term terms are confirmed. Your contact details stay private.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">For property owners</p>
      <h1 className="mt-2 text-4xl md:text-5xl">Put underused space to work.</h1>
      <p className="mt-3 text-muted-foreground">Submit a storefront, unit or weekend-available space. New submissions go to review and are never automatically verified.</p>
      <div className="mt-10 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property name"><Input value={f.name} onChange={(e) => up({ name: e.target.value })} /></Field>
          <Field label="Street address"><Input value={f.address} onChange={(e) => up({ address: e.target.value })} /></Field>
          <TextField label="Property type" value={f.propertyType} onChange={(v) => up({ propertyType: v })} placeholder="Storefront, gallery, shared space…" />
          <NumField label="Size (SF)" value={f.sqft} onChange={(v) => up({ sqft: v })} />
          <NumField label="Capacity (people)" value={f.capacity} onChange={(v) => up({ capacity: v })} />
          <NumField label="Minimum rental (days)" value={f.minDurationDays} onChange={(v) => up({ minDurationDays: v })} />
        </div>
        <Field label="Neighborhood"><Chips options={NEIGHBORHOODS.map((n) => ({ value: n, label: n }))} value={f.neighborhood ? [f.neighborhood] : []} onChange={(v) => up({ neighborhood: v.at(-1) ?? null })} /></Field>
        <Field label="Amenities available"><Chips options={AMENITIES} value={f.amenities as never[]} onChange={(v) => up({ amenities: v })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Permitted uses"><Textarea rows={2} value={f.permittedUses ?? ""} onChange={(e) => up({ permittedUses: e.target.value || null })} /></Field>
          <Field label="Prohibited activities"><Textarea rows={2} value={f.prohibitedUses ?? ""} onChange={(e) => up({ prohibitedUses: e.target.value || null })} /></Field>
          <Field label="Available dates"><Textarea rows={2} value={f.availableDates ?? ""} onChange={(e) => up({ availableDates: e.target.value || null })} placeholder="e.g. Weekends Dec–Mar" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Rental price" prefix="$" value={f.price} onChange={(v) => up({ price: v })} />
            <Field label="Per">
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={f.pricePeriod} onChange={(e) => up({ pricePeriod: e.target.value })}>
                <option value="per_day">Day</option><option value="per_weekend">Weekend</option><option value="per_week">Week</option><option value="per_month">Month</option>
              </select>
            </Field>
          </div>
          <Field label="Insurance documentation required"><Textarea rows={2} value={f.insuranceRequirements ?? ""} onChange={(e) => up({ insuranceRequirements: e.target.value || null })} /></Field>
          <Field label="Other requirements"><Textarea rows={2} value={f.otherRequirements ?? ""} onChange={(e) => up({ otherRequirements: e.target.value || null })} /></Field>
        </div>
        <div className="rounded-lg border border-border px-4"><Tri label="Willing to consider flexible leasing" value={f.flexibleLeasing} onChange={(v) => up({ flexibleLeasing: v })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name"><Input value={f.contactName} onChange={(e) => up({ contactName: e.target.value })} /></Field>
          <Field label="Contact email (kept private)"><Input type="email" value={f.contactEmail} onChange={(e) => up({ contactEmail: e.target.value })} /></Field>
        </div>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={f.authorized} onCheckedChange={(v) => up({ authorized: v === true })} />I am the owner or an authorized manager of this property.</label>
        <Button size="lg" onClick={send} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Submit for review</Button>
      </div>
    </div>
  );
}

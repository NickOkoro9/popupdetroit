import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Papa from "papaparse";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/pd/fields";
import { importProperties } from "@/lib/api.functions";

export const Route = createFileRoute("/admin/import")({
  head: () => ({
    meta: [
      { title: "Import property data — PopUp Detroit" },
      { name: "description", content: "Administrator import for real, source-linked Detroit property records (CSV or JSON)." },
      { property: "og:title", content: "Import property data — PopUp Detroit" },
      { property: "og:description", content: "CSV/JSON import for verified property records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportPage,
});

const ARRAYS = ["amenities", "amenities_unavailable", "permitted_uses", "prohibited_uses", "landlord_requirements"];
const NUMS = ["lat", "lng", "sqft_min", "sqft_max", "capacity", "price_amount", "min_duration_days"];
const BOOLS = ["short_term_confirmed", "flexible_negotiable", "owner_contact_authorized"];

function normalize(row: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(row)) {
    const v = (raw ?? "").trim();
    if (ARRAYS.includes(k)) out[k] = v ? v.split("|").map((s) => s.trim()).filter(Boolean) : [];
    else if (NUMS.includes(k)) out[k] = v === "" ? null : Number(v);
    else if (BOOLS.includes(k)) out[k] = v === "" ? (k === "flexible_negotiable" ? null : false) : v.toLowerCase() === "true";
    else out[k] = v === "" ? null : v;
  }
  return out;
}

function ImportPage() {
  const [passcode, setPasscode] = useState("");
  const [rows, setRows] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; errors: string[] } | null>(null);
  const run = useServerFn(importProperties);
  const qc = useQueryClient();

  const onFile = async (file: File) => {
    setResult(null);
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      try { const j = JSON.parse(text); setRows(Array.isArray(j) ? j : [j]); }
      catch { setResult({ ok: false, msg: "Invalid JSON file.", errors: [] }); }
    } else {
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      setRows(parsed.data.map(normalize));
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await run({ data: { passcode, rows } });
      if (res.ok) { setResult({ ok: true, msg: `Imported ${res.imported} record(s).`, errors: res.errors }); await qc.invalidateQueries(); }
      else setResult({ ok: false, msg: res.error, errors: res.errors ?? [] });
    } catch { setResult({ ok: false, msg: "Import request failed.", errors: [] }); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <p className="eyebrow">Administrator</p>
      <h1 className="mt-2 text-4xl">Import property data</h1>
      <p className="mt-3 text-muted-foreground">Upload real, source-linked records only. Every row needs a source URL and last-verified date. Unknown values should be left blank — never estimated. Records marked <i>verified_short_term</i> must have owner confirmation.</p>
      <a href="/templates/popup-detroit-properties-template.csv" download className="mt-4 inline-block text-sm text-primary underline">Download CSV template</a>
      <p className="mt-1 text-xs text-muted-foreground">List fields use "|" separators. Re-importing an existing id updates it.</p>
      <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="CSV or JSON file"><Input type="file" accept=".csv,.json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></Field>
        {rows.length > 0 && <p className="text-sm text-muted-foreground">{rows.length} row(s) ready.</p>}
        <Field label="Admin passcode"><Input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} /></Field>
        <Button onClick={submit} disabled={busy || !rows.length || !passcode}>{busy && <Loader2 className="animate-spin" />}Import</Button>
        {result && (
          <div className={`rounded-lg p-3 text-sm ${result.ok ? "bg-status-verified-bg text-status-verified" : "bg-destructive/10 text-destructive"}`}>
            <p>{result.msg}</p>
            {result.errors.length > 0 && <ul className="mt-2 list-disc pl-5">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          </div>
        )}
      </div>
    </div>
  );
}

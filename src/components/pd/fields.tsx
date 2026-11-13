import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TriState } from "@/lib/matching/types";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NumField({ label, value, onChange, hint, prefix }: { label: string; value: number | null; onChange: (v: number | null) => void; hint?: string | undefined; prefix?: string | undefined }) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <Input type="number" min={0} inputMode="numeric" className={prefix ? "pl-7" : ""} value={value ?? ""} placeholder="Not specified"
          onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} />
      </div>
    </Field>
  );
}

export function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string | null; onChange: (v: string | null) => void; placeholder?: string | undefined; type?: string }) {
  return (
    <Field label={label}>
      <Input type={type} value={value ?? ""} placeholder={placeholder ?? "Not specified"} onChange={(e) => onChange(e.target.value || null)} />
    </Field>
  );
}

export function Tri({ label, value, onChange }: { label: string; value: TriState; onChange: (v: TriState) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="inline-flex rounded-md border border-input p-0.5 text-xs">
        {(["yes", "no", "unknown"] as const).map((v) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn("rounded px-2.5 py-1 capitalize transition-colors", value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {v === "unknown" ? "Not specified" : v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

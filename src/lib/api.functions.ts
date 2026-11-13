import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { Property } from "./matching/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listProperties = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().from("properties").select("*").order("last_verified", { ascending: false });
  if (error) throw new Error("Could not load property records.");
  return (data ?? []) as unknown as Property[];
});

export const getProperty = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient().from("properties").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error("Could not load property.");
    return (row ?? null) as unknown as Property | null;
  });

export const extractBusinessDNA = createServerFn({ method: "POST" })
  .inputValidator((d: { description: string }) => z.object({ description: z.string().trim().min(10).max(3000) }).parse(d))
  .handler(async ({ data }) => {
    const { extractDNA, aiErrorMessage, AI_PROVIDER } = await import("./ai.server");
    try {
      const result = await extractDNA(data.description, new Date().toISOString().slice(0, 10));
      return { ok: true as const, source: "live_ai" as const, provider: AI_PROVIDER, result };
    } catch (e) {
      console.error("DNA extraction failed", e);
      return { ok: false as const, error: aiErrorMessage(e) };
    }
  });

export const explainResults = createServerFn({ method: "POST" })
  .inputValidator((d: { requirements: unknown; items: { id: string; facts: unknown }[] }) =>
    z.object({ requirements: z.unknown(), items: z.array(z.object({ id: z.string(), facts: z.unknown() })).max(8) }).parse(d))
  .handler(async ({ data }) => {
    const { explainMatches, aiErrorMessage } = await import("./ai.server");
    try {
      const out = await explainMatches(data.requirements, data.items);
      return { ok: true as const, explanations: out.explanations };
    } catch (e) {
      console.error("Explain failed", e);
      return { ok: false as const, error: aiErrorMessage(e) };
    }
  });

export const draftFlexLease = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => z.record(z.unknown()).parse(d))
  .handler(async ({ data }) => {
    const { draftProposal, aiErrorMessage } = await import("./ai.server");
    try {
      return { ok: true as const, ...(await draftProposal(data)) };
    } catch (e) {
      console.error("Draft failed", e);
      return { ok: false as const, error: aiErrorMessage(e) };
    }
  });

const inquirySchema = z.object({
  propertyId: z.string().min(1).max(120),
  inquiryType: z.enum(["request_to_book", "flexible_lease", "information"]),
  contactName: z.string().trim().min(1).max(120),
  contactEmail: z.string().trim().email().max(200),
  proposedStart: z.string().date().nullable(),
  proposedEnd: z.string().date().nullable(),
  proposedBudget: z.number().nonnegative().max(1_000_000).nullable(),
  expectedAttendance: z.number().int().nonnegative().max(100_000).nullable(),
  intendedUse: z.string().max(500).nullable(),
  message: z.string().trim().min(10).max(4000),
  requirements: z.unknown(),
  matchSnapshot: z.unknown(),
});

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof inquirySchema>) => inquirySchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prop } = await supabaseAdmin.from("properties").select("id, verification_status, short_term_confirmed").eq("id", data.propertyId).maybeSingle();
    if (!prop) return { ok: false as const, error: "Property not found." };
    // A booking request is only allowed for verified short-term properties.
    const type = data.inquiryType === "request_to_book" && !(prop.verification_status === "verified_short_term" && prop.short_term_confirmed)
      ? "flexible_lease" : data.inquiryType;
    const { data: row, error } = await supabaseAdmin.from("inquiries").insert({
      property_id: data.propertyId,
      inquiry_type: type,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      proposed_start: data.proposedStart,
      proposed_end: data.proposedEnd,
      proposed_budget: data.proposedBudget,
      expected_attendance: data.expectedAttendance,
      intended_use: data.intendedUse,
      message: data.message,
      requirements: (data.requirements ?? null) as never,
      match_snapshot: (data.matchSnapshot ?? null) as never,
      delivery_status: "saved_not_sent",
    }).select("id, created_at, delivery_status, inquiry_type").single();
    if (error) { console.error(error); return { ok: false as const, error: "Could not save your inquiry. Please try again." }; }
    return { ok: true as const, inquiry: row };
  });

const ownerSchema = z.object({
  contactName: z.string().trim().min(1).max(120),
  contactEmail: z.string().trim().email().max(200),
  payload: z.object({
    name: z.string().trim().min(1).max(200),
    address: z.string().trim().min(5).max(300),
    neighborhood: z.string().max(100).nullable(),
    propertyType: z.string().max(100).nullable(),
    sqft: z.number().nonnegative().max(1_000_000).nullable(),
    capacity: z.number().int().nonnegative().max(100_000).nullable(),
    amenities: z.array(z.string().max(50)).max(30),
    permittedUses: z.string().max(1000).nullable(),
    prohibitedUses: z.string().max(1000).nullable(),
    availableDates: z.string().max(500).nullable(),
    price: z.number().nonnegative().max(1_000_000).nullable(),
    pricePeriod: z.string().max(30).nullable(),
    minDurationDays: z.number().int().nonnegative().max(3650).nullable(),
    insuranceRequirements: z.string().max(1000).nullable(),
    otherRequirements: z.string().max(1000).nullable(),
    flexibleLeasing: z.enum(["yes", "no", "unknown"]),
    authorizedToList: z.literal(true),
  }),
});

export const submitOwnerProperty = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ownerSchema>) => ownerSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("owner_submissions").insert({
      contact_name: data.contactName, contact_email: data.contactEmail, payload: data.payload as never,
    }).select("id, review_status").single();
    if (error) { console.error(error); return { ok: false as const, error: "Could not save your submission." }; }
    return { ok: true as const, submission: row };
  });

const importRow = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/),
  name: z.string().min(1).max(200),
  address: z.string().min(5).max(300),
  neighborhood: z.string().max(100).nullable().optional(),
  lat: z.number().min(42.2).max(42.5).nullable().optional(),
  lng: z.number().min(-83.3).max(-82.9).nullable().optional(),
  coord_precision: z.string().max(30).optional(),
  property_type: z.string().max(100).nullable().optional(),
  sqft_min: z.number().int().nullable().optional(),
  sqft_max: z.number().int().nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  amenities_unavailable: z.array(z.string()).optional(),
  permitted_uses: z.array(z.string()).optional(),
  prohibited_uses: z.array(z.string()).optional(),
  price_amount: z.number().nullable().optional(),
  price_period: z.enum(["per_day", "per_weekend", "per_week", "per_month", "per_sf_year"]).nullable().optional(),
  price_notes: z.string().max(500).nullable().optional(),
  available_from: z.string().date().nullable().optional(),
  available_to: z.string().date().nullable().optional(),
  available_notes: z.string().max(500).nullable().optional(),
  min_duration_days: z.number().int().nullable().optional(),
  landlord_requirements: z.array(z.string()).optional(),
  description: z.string().max(2000).nullable().optional(),
  source_name: z.string().min(1).max(200),
  source_url: z.string().url().max(1000),
  last_verified: z.string().date(),
  verification_status: z.enum(["verified_short_term", "advertised_for_lease", "potential_opportunity"]),
  short_term_confirmed: z.boolean().optional(),
  flexible_negotiable: z.boolean().nullable().optional(),
  owner_contact_authorized: z.boolean().optional(),
  photo_url: z.string().url().nullable().optional(),
});

export const importProperties = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; rows: unknown[] }) => z.object({ passcode: z.string().max(200), rows: z.array(z.unknown()).min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_IMPORT_PASSCODE"];
    if (!expected) return { ok: false as const, error: "Import is disabled: no admin passcode has been configured yet." };
    if (data.passcode !== expected) return { ok: false as const, error: "Incorrect admin passcode." };
    const errors: string[] = [];
    const valid: z.infer<typeof importRow>[] = [];
    data.rows.forEach((r, i) => {
      const p = importRow.safeParse(r);
      if (!p.success) errors.push(`Row ${i + 1}: ${p.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
      else {
        // Verified short-term requires explicit owner confirmation.
        if (p.data.verification_status === "verified_short_term" && !p.data.short_term_confirmed)
          errors.push(`Row ${i + 1}: verified_short_term requires short_term_confirmed = true`);
        else valid.push(p.data);
      }
    });
    if (!valid.length) return { ok: false as const, error: "No valid rows.", errors };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("properties").upsert(valid as never);
    if (error) { console.error(error); return { ok: false as const, error: "Database rejected the import.", errors }; }
    return { ok: true as const, imported: valid.length, errors };
  });

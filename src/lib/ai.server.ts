// AI provider layer. Swap MODEL / implementation here to move between providers.
//
// Provider selection (server-side only, never exposed to the browser):
//   1. WATSONX_API_KEY + WATSONX_PROJECT_ID present  → IBM watsonx.ai (hackathon / IBM Cloud)
//   2. LOVABLE_API_KEY present                        → Lovable AI Gateway (hosted deployment)
//   3. OPENAI_API_KEY present                         → OpenAI Chat Completions (local dev fallback)
//   4. None of the above                              → falls through to Lovable gateway error
//
// Required env vars:
//   WATSONX_API_KEY      IBM Cloud IAM API key (never an IAM Bearer token — exchanged server-side)
//   WATSONX_PROJECT_ID   watsonx.ai Studio project ID (from project → Manage → General)
//   WATSONX_URL          Regional endpoint, e.g. https://us-south.ml.cloud.ibm.com (default: us-south)
//   WATSONX_MODEL        Optional model override (default: ibm/granite-3-8b-instruct).
//                        Confirmed chat-capable in us-south: ibm/granite-4-h-small
//   OPENAI_API_KEY       OpenAI secret key (sk-...)
//   OPENAI_MODEL         Optional model override for OpenAI (default: gpt-4o-mini)
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import type { Requirements } from "./matching/types";
import { CATEGORIES, DURATIONS, AMENITIES, NEIGHBORHOODS, REGULATED } from "./matching/types";

// ── Provider detection ────────────────────────────────────────────────────────

function activeProvider(): "watsonx" | "lovable" | "openai" {
  if (process.env["WATSONX_API_KEY"] && process.env["WATSONX_PROJECT_ID"]) return "watsonx";
  if (process.env["LOVABLE_API_KEY"]) return "lovable";
  if (process.env["OPENAI_API_KEY"]) return "openai";
  // Let the Lovable gateway throw its own ConfigurationError when no key is set.
  return "lovable";
}

export const AI_PROVIDER = (() => {
  const p = activeProvider();
  if (p === "watsonx") {
    // ibm/granite-3-8b-instruct is the schema default; set WATSONX_MODEL=ibm/granite-4-h-small
    // in .env if that model is not available in your region (confirmed in us-south).
    const model = process.env["WATSONX_MODEL"] ?? "ibm/granite-3-8b-instruct";
    return { name: "IBM watsonx.ai", model } as const;
  }
  if (p === "openai") {
    const model = process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";
    return { name: "OpenAI (local fallback)", model } as const;
  }
  return { name: "Lovable AI Gateway", model: "openai/gpt-6-astra" } as const;
})();

// ── Lovable gateway response parser ─────────────────────────────────────────

type AnyResp = { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
function outputText(resp: unknown): string {
  const r = resp as AnyResp;
  return (r.output ?? [])
    .flatMap((o) => (o.type === "message" ? (o.content ?? []) : []))
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("");
}

// ── Error messages ────────────────────────────────────────────────────────────

export function aiErrorMessage(e: unknown): string {
  if (e instanceof GatewayError) {
    if (e.code === "payment_required") return "AI credits are exhausted for this workspace.";
    if (e.code === "rate_limited") return "The AI service is busy. Please try again in a moment.";
    return `AI service error (${e.code}).`;
  }
  if (e instanceof Error) {
    if (e.message.startsWith("OpenAI:")) return e.message;
    if (e.message.startsWith("watsonx:")) return e.message;
  }
  return "AI service unavailable.";
}

// ── OpenAI Chat Completions fallback (no extra npm package) ──────────────────

async function jsonCallOpenAI<T>(
  system: string,
  user: string,
  name: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env["OPENAI_API_KEY"]!;
  const model = process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name, schema, strict: true },
    },
  });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI: HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";
  return JSON.parse(content) as T;
}

// ── IBM watsonx.ai provider ───────────────────────────────────────────────────
//
// Authentication: IBM Cloud IAM API key → short-lived Bearer token (1 hour).
// The token is cached in module scope and refreshed when it expires.

let _iamToken: string | null = null;
let _iamExpiry = 0;

/** Exchange an IBM Cloud IAM API key for a Bearer access token. */
async function getIamToken(): Promise<string> {
  const now = Date.now();
  if (_iamToken && now < _iamExpiry) return _iamToken;

  const apiKey = process.env["WATSONX_API_KEY"]!;
  const params = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey,
  });
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`watsonx: IAM token exchange failed — HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("watsonx: IAM response did not include access_token");
  }
  _iamToken = json.access_token;
  // Refresh 60 seconds before expiry (default token lifetime is 3600 s).
  _iamExpiry = now + ((json.expires_in ?? 3600) - 60) * 1000;
  return _iamToken;
}

/** Reset the cached IAM token (used in tests). */
export function _resetIamCache(): void {
  _iamToken = null;
  _iamExpiry = 0;
}

async function jsonCallWatsonx<T>(
  system: string,
  user: string,
  _name: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const token = await getIamToken();
  const projectId = process.env["WATSONX_PROJECT_ID"]!;
  const baseUrl = (process.env["WATSONX_URL"] ?? "https://us-south.ml.cloud.ibm.com").replace(/\/$/, "");
  const model = process.env["WATSONX_MODEL"] ?? "ibm/granite-3-8b-instruct";

  // Instruct the model to respond with strict JSON only, and explicitly state the
  // required top-level keys.  granite-4-h-small ignores the JSON schema and returns
  // a flat object unless the structure is described in the system message itself.
  const requiredKeys = (schema as { required?: string[] }).required ?? [];
  const structureHint = requiredKeys.length > 0
    ? `\n\nIMPORTANT: Respond with a single valid JSON object only. No markdown, no code fences, no explanation.\nThe JSON object MUST have exactly these top-level keys: ${requiredKeys.map((k) => `"${k}"`).join(", ")}.`
    : `\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object.`;
  const systemWithJson = `${system}${structureHint}`;

  const body = JSON.stringify({
    model_id: model,
    project_id: projectId,
    messages: [
      { role: "system", content: systemWithJson },
      { role: "user", content: user },
    ],
    parameters: {
      max_new_tokens: 2048,
      temperature: 0,
    },
  });

  const res = await fetch(`${baseUrl}/ml/v1/text/chat?version=2024-05-31`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      // Invalidate cached token so the next call retries auth.
      _iamToken = null;
      _iamExpiry = 0;
    }
    throw new Error(`watsonx: HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    results?: Array<{ generated_text?: string }>;
  };

  // The /ml/v1/text/chat endpoint returns OpenAI-compatible `choices`.
  const rawContent =
    json.choices?.[0]?.message?.content ??
    json.results?.[0]?.generated_text ??
    "";

  // Strip accidental markdown fences before parsing.
  const stripped = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(`watsonx: model returned non-JSON — ${stripped.slice(0, 200)}`);
  }

  // Validate that the parsed object satisfies the top-level required keys from the schema.
  // granite-4-h-small sometimes returns the fields directly (flat) instead of wrapped in
  // { fields: {...}, implied: [...], ... }.  Letting an invalid shape through causes a
  // Seroval serialization crash in the server function response pipeline.
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`watsonx: model returned non-object JSON — ${stripped.slice(0, 100)}`);
  }
  const required = (schema as { required?: string[] }).required ?? [];
  if (required.length > 0) {
    const parsedObj = parsed as Record<string, unknown>;
    const missingKeys = required.filter((k) => !(k in parsedObj));
    if (missingKeys.length > 0) {
      throw new Error(
        `watsonx: model response missing required keys [${missingKeys.join(", ")}] — model may have returned a flat object instead of the expected schema wrapper. Raw: ${stripped.slice(0, 200)}`,
      );
    }
  }

  return parsed as T;
}

// ── Unified dispatcher ────────────────────────────────────────────────────────

async function jsonCall<T>(system: string, user: string, name: string, schema: Record<string, unknown>): Promise<T> {
  const provider = activeProvider();
  if (provider === "watsonx") {
    return jsonCallWatsonx<T>(system, user, name, schema);
  }
  if (provider === "openai") {
    return jsonCallOpenAI<T>(system, user, name, schema);
  }
  const resp = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions: system,
    input: [{ role: "user", content: user }],
    reasoning: { effort: "low" },
    text: { format: { type: "json_schema", name, schema, strict: true } },
  });
  return JSON.parse(outputText(resp)) as T;
}

const tri = { type: "string", enum: ["yes", "no", "unknown"] };
const nNum = { type: ["number", "null"] };
const nStr = { type: ["string", "null"] };

const DNA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fields", "implied", "missing", "followUps", "summary"],
  properties: {
    fields: {
      type: "object",
      additionalProperties: false,
      required: ["businessName", "category", "activities", "expectedAttendance", "operatesPhysically", "recurring", "neighborhoods", "locationFlexible", "maxBudget", "dailyBudget", "startDate", "endDate", "datesFlexible", "duration", "minSqft", "capacity", "amenitiesRequired", "amenitiesPreferred", "regulated", "operatingHours", "hasInsurance", "hasLicenses", "hasPermits"],
      properties: {
        businessName: nStr,
        category: { type: ["string", "null"], enum: [...CATEGORIES, null] },
        activities: nStr,
        expectedAttendance: nNum,
        operatesPhysically: tri,
        recurring: tri,
        neighborhoods: { type: "array", items: { type: "string", enum: [...NEIGHBORHOODS] } },
        locationFlexible: tri,
        maxBudget: nNum,
        dailyBudget: nNum,
        startDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
        endDate: { type: ["string", "null"], description: "YYYY-MM-DD" },
        datesFlexible: tri,
        duration: { type: ["string", "null"], enum: [...DURATIONS.map((d) => d.value), null] },
        minSqft: nNum,
        capacity: nNum,
        amenitiesRequired: { type: "array", items: { type: "string", enum: AMENITIES.map((a) => a.value) } },
        amenitiesPreferred: { type: "array", items: { type: "string", enum: AMENITIES.map((a) => a.value) } },
        regulated: {
          type: "object",
          additionalProperties: false,
          required: REGULATED.map((r) => r.value),
          properties: Object.fromEntries(REGULATED.map((r) => [r.value, tri])),
        },
        operatingHours: nStr,
        hasInsurance: tri,
        hasLicenses: tri,
        hasPermits: tri,
      },
    },
    implied: { type: "array", items: { type: "string" }, description: "Plausible but unconfirmed requirements, phrased as possibilities" },
    missing: { type: "array", items: { type: "string" }, description: "Critical information not provided" },
    followUps: { type: "array", items: { type: "string" }, description: "Up to 4 targeted questions" },
    summary: { type: "string" },
  },
};

export interface DnaResult {
  fields: Partial<Requirements>;
  implied: string[];
  missing: string[];
  followUps: string[];
  summary: string;
}

export function extractDNA(description: string, today: string) {
  return jsonCall<DnaResult>(
    `You convert an entrepreneur's description of a Detroit pop-up business into structured requirements.
Rules:
- Only fill a field when the text states it explicitly. Otherwise use null, [] or "unknown". Never treat unspecified as "no".
- operatesPhysically is "yes" only if they say they already run a physical location; "launching" or "new brand" alone => "unknown".
- "I don't have insurance" => hasInsurance "no". Silence => "unknown".
- Saturday and Sunday / a weekend => duration "weekend". Do not invent calendar dates unless given; today is ${today}.
- maxBudget is the TOTAL MAXIMUM spend for the entire stay (the hard upper limit). dailyBudget is an optional per-day preference; leave it null unless a daily rate is explicitly stated. "My total budget is $500" => maxBudget 500, dailyBudget null.
- "capacity for N", "space for N customers", "room for N people", "enough space for N" => capacity N and expectedAttendance N.
- Put needs stated as must-haves in amenitiesRequired (e.g. "I need electricity", "require a restroom", "must have wifi"). "Would be nice" or "prefer" go in amenitiesPreferred.
- Neighborhood names must match the allowed list; Midtown Detroit => "Midtown".
- implied: requirements that are likely but not stated (e.g. "Display fixtures may be useful for apparel"), never asserted as fact.
- summary: one plain-English sentence.`,
    description,
    "business_dna",
    DNA_SCHEMA,
  );
}

export interface ExplainItem { id: string; facts?: unknown }
export function explainMatches(requirementsSummary: unknown, items: ExplainItem[]) {
  return jsonCall<{ explanations: { id: string; text: string }[] }>(
    `You explain pre-computed property match results to an entrepreneur in 2-3 plain sentences per property.
Use ONLY the supplied facts and check results. Never invent prices, amenities, availability or landlord permissions.
Always mention when availability or short-term terms are unconfirmed. Never say a property is approved, legal or booked.
Do not restate the numeric score. Suggest the next step (request to book, propose a flexible lease, or request information) that matches the given status.`,
    JSON.stringify({ requirements: requirementsSummary, properties: items }),
    "match_explanations",
    {
      type: "object", additionalProperties: false, required: ["explanations"],
      properties: { explanations: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "text"], properties: { id: { type: "string" }, text: { type: "string" } } } } },
    },
  );
}

export function draftProposal(input: unknown) {
  return jsonCall<{ message: string; assumptions: string[] }>(
    `You draft a concise, professional short-term occupancy proposal from an entrepreneur to a commercial property owner/broker (max 170 words).
Clearly frame proposed terms as proposals. Never claim the landlord agreed to anything. Do not invent facts about the property or the business.
List any assumptions you had to make separately in "assumptions".`,
    JSON.stringify(input),
    "flexlease_proposal",
    {
      type: "object", additionalProperties: false, required: ["message", "assumptions"],
      properties: { message: { type: "string" }, assumptions: { type: "array", items: { type: "string" } } },
    },
  );
}

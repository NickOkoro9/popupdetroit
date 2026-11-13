/**
 * Provider selection and failure-handling tests for ai.server.ts.
 *
 * These tests run without network access and without real API keys by
 * intercepting `fetch` and mocking the Lovable gateway module.
 *
 * Run with: npm test  (vitest run)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal valid DnaResult-shaped JSON string */
const dnaPayload = JSON.stringify({
  fields: {
    businessName: null, category: null, activities: null, expectedAttendance: null,
    operatesPhysically: "unknown", recurring: "unknown", neighborhoods: [],
    locationFlexible: "unknown", maxBudget: null, dailyBudget: null,
    startDate: null, endDate: null, datesFlexible: "unknown", duration: null,
    minSqft: null, capacity: null, amenitiesRequired: [], amenitiesPreferred: [],
    regulated: { alcohol: "unknown", food: "unknown", live_music: "unknown", amplified_sound: "unknown", minors: "unknown", tobacco: "unknown", cannabis: "unknown" },
    operatingHours: null, hasInsurance: "unknown", hasLicenses: "unknown", hasPermits: "unknown",
  },
  implied: [], missing: [], followUps: [], summary: "Test business.",
});

function openAiOkResponse(content: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** IAM token exchange success response */
function iamTokenResponse(token = "test-iam-token", expiresIn = 3600) {
  return new Response(
    JSON.stringify({ access_token: token, expires_in: expiresIn }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** watsonx.ai chat completion success response (OpenAI-compatible shape) */
function watsonxOkResponse(content: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ── environment isolation ─────────────────────────────────────────────────────

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const saved: Record<string, string | undefined> = {};
    for (const k of Object.keys(vars)) saved[k] = process.env[k];
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try { await fn(); }
    finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("AI provider selection", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("reports 'IBM watsonx.ai' when WATSONX_API_KEY and WATSONX_PROJECT_ID are set", withEnv(
    {
      WATSONX_API_KEY: "test-wx-key",
      WATSONX_PROJECT_ID: "test-proj-id",
      LOVABLE_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
    },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.name).toBe("IBM watsonx.ai");
      expect(AI_PROVIDER.model).toBe("ibm/granite-3-8b-instruct");
    },
  ));

  it("uses WATSONX_MODEL override when provided", withEnv(
    {
      WATSONX_API_KEY: "test-wx-key",
      WATSONX_PROJECT_ID: "test-proj-id",
      WATSONX_MODEL: "ibm/granite-3-3b-a800m-instruct",
      LOVABLE_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
    },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.model).toBe("ibm/granite-3-3b-a800m-instruct");
    },
  ));

  it("prefers watsonx over Lovable when both are set", withEnv(
    {
      WATSONX_API_KEY: "test-wx-key",
      WATSONX_PROJECT_ID: "test-proj-id",
      LOVABLE_API_KEY: "test-lovable-key",
      OPENAI_API_KEY: undefined,
    },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.name).toBe("IBM watsonx.ai");
    },
  ));

  it("reports 'Lovable AI Gateway' when LOVABLE_API_KEY is set (no watsonx)", withEnv(
    { WATSONX_API_KEY: undefined, WATSONX_PROJECT_ID: undefined, LOVABLE_API_KEY: "test-lovable-key", OPENAI_API_KEY: undefined },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.name).toBe("Lovable AI Gateway");
      expect(AI_PROVIDER.model).toBe("openai/gpt-6-astra");
    },
  ));

  it("reports 'OpenAI (local fallback)' when only OPENAI_API_KEY is set", withEnv(
    { WATSONX_API_KEY: undefined, WATSONX_PROJECT_ID: undefined, LOVABLE_API_KEY: undefined, OPENAI_API_KEY: "sk-test" },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.name).toBe("OpenAI (local fallback)");
    },
  ));

  it("uses OPENAI_MODEL when provided", withEnv(
    { WATSONX_API_KEY: undefined, WATSONX_PROJECT_ID: undefined, LOVABLE_API_KEY: undefined, OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4o" },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.model).toBe("gpt-4o");
    },
  ));

  it("defaults to gpt-4o-mini when OPENAI_MODEL is not set", withEnv(
    { WATSONX_API_KEY: undefined, WATSONX_PROJECT_ID: undefined, LOVABLE_API_KEY: undefined, OPENAI_API_KEY: "sk-test", OPENAI_MODEL: undefined },
    async () => {
      const { AI_PROVIDER } = await import("./ai.server");
      expect(AI_PROVIDER.model).toBe("gpt-4o-mini");
    },
  ));
});

describe("OpenAI fallback — extractDNA", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("calls OpenAI and returns parsed DnaResult", withEnv(
    { WATSONX_API_KEY: undefined, WATSONX_PROJECT_ID: undefined, LOVABLE_API_KEY: undefined, OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4o-mini" },
    async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(openAiOkResponse(dnaPayload)));
      const { extractDNA } = await import("./ai.server");
      const result = await extractDNA("I want to sell vintage clothing in Midtown.", "2026-11-13");
      expect(result.summary).toBe("Test business.");
      expect(result.implied).toEqual([]);
      // Verify fetch was called with the OpenAI endpoint
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
    },
  ));

  it("surfaces a readable error message on HTTP 429", withEnv(
    { WATSONX_API_KEY: undefined, WATSONX_PROJECT_ID: undefined, LOVABLE_API_KEY: undefined, OPENAI_API_KEY: "sk-test" },
    async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response("rate limit exceeded", { status: 429 }),
      ));
      const { extractDNA, aiErrorMessage } = await import("./ai.server");
      let caught: unknown;
      try { await extractDNA("test business description here", "2026-11-13"); }
      catch (e) { caught = e; }
      expect(caught).toBeInstanceOf(Error);
      const msg = aiErrorMessage(caught);
      expect(msg).toMatch(/OpenAI: HTTP 429/);
    },
  ));

  it("aiErrorMessage returns a generic string for unknown errors", async () => {
    const { aiErrorMessage } = await import("./ai.server");
    expect(aiErrorMessage(new Error("network blip"))).toBe("AI service unavailable.");
    expect(aiErrorMessage("string error")).toBe("AI service unavailable.");
  });
});

describe("watsonx.ai provider — extractDNA", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); });

  const wxEnv = {
    WATSONX_API_KEY: "test-wx-apikey",
    WATSONX_PROJECT_ID: "test-proj-123",
    WATSONX_URL: "https://us-south.ml.cloud.ibm.com",
    LOVABLE_API_KEY: undefined,
    OPENAI_API_KEY: undefined,
  };

  it("exchanges IAM key and calls watsonx chat endpoint, returning DnaResult", withEnv(wxEnv, async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(iamTokenResponse())             // IAM exchange
      .mockResolvedValueOnce(watsonxOkResponse(dnaPayload)); // watsonx chat
    vi.stubGlobal("fetch", fetchMock);

    const { extractDNA, _resetIamCache } = await import("./ai.server");
    _resetIamCache();

    const result = await extractDNA("I want to open a food stall in Corktown.", "2026-11-13");
    expect(result.summary).toBe("Test business.");

    // First call must be to the IAM token endpoint
    const [iamUrl, iamOpts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(iamUrl).toBe("https://iam.cloud.ibm.com/identity/token");
    expect((iamOpts.body as string)).toContain("grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey");

    // Second call must be to the watsonx chat endpoint
    const [wxUrl, wxOpts] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(wxUrl).toContain("/ml/v1/text/chat");
    expect(wxOpts.headers as Record<string, string>).toMatchObject({
      Authorization: "Bearer test-iam-token",
    });
    const reqBody = JSON.parse(wxOpts.body as string) as { model_id: string; project_id: string };
    expect(reqBody.model_id).toBe("ibm/granite-3-8b-instruct");
    expect(reqBody.project_id).toBe("test-proj-123");
  }));

  it("caches the IAM token for subsequent calls", withEnv(wxEnv, async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(iamTokenResponse("cached-token", 3600))
      // Each subsequent call needs a fresh Response (body can only be read once)
      .mockImplementation(() => Promise.resolve(watsonxOkResponse(dnaPayload)));
    vi.stubGlobal("fetch", fetchMock);

    const { extractDNA, _resetIamCache } = await import("./ai.server");
    _resetIamCache();

    await extractDNA("first call", "2026-11-13");
    await extractDNA("second call", "2026-11-13");

    // IAM endpoint should be called only once (second call uses cache)
    const iamCalls = fetchMock.mock.calls.filter(([url]) => (url as string).includes("iam.cloud.ibm.com"));
    expect(iamCalls).toHaveLength(1);
  }));

  it("surfaces a readable error message on watsonx HTTP 401", withEnv(wxEnv, async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(iamTokenResponse())
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { extractDNA, aiErrorMessage, _resetIamCache } = await import("./ai.server");
    _resetIamCache();

    let caught: unknown;
    try { await extractDNA("test", "2026-11-13"); }
    catch (e) { caught = e; }

    expect(caught).toBeInstanceOf(Error);
    const msg = aiErrorMessage(caught);
    expect(msg).toMatch(/watsonx: HTTP 401/);
  }));

  it("surfaces a readable error on IAM exchange failure", withEnv(wxEnv, async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("forbidden", { status: 403 }),
    ));

    const { extractDNA, aiErrorMessage, _resetIamCache } = await import("./ai.server");
    _resetIamCache();

    let caught: unknown;
    try { await extractDNA("test", "2026-11-13"); }
    catch (e) { caught = e; }

    expect(caught).toBeInstanceOf(Error);
    const msg = aiErrorMessage(caught);
    expect(msg).toMatch(/watsonx: IAM token exchange failed/);
  }));

  it("handles markdown-fenced JSON in model response", withEnv(wxEnv, async () => {
    const fencedPayload = "```json\n" + dnaPayload + "\n```";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(iamTokenResponse())
      .mockResolvedValueOnce(watsonxOkResponse(fencedPayload));
    vi.stubGlobal("fetch", fetchMock);

    const { extractDNA, _resetIamCache } = await import("./ai.server");
    _resetIamCache();

    const result = await extractDNA("test", "2026-11-13");
    expect(result.summary).toBe("Test business.");
  }));

  it("throws a clear error when model returns non-JSON", withEnv(wxEnv, async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(iamTokenResponse())
      .mockResolvedValueOnce(watsonxOkResponse("Sorry, I cannot answer that."));
    vi.stubGlobal("fetch", fetchMock);

    const { extractDNA, _resetIamCache } = await import("./ai.server");
    _resetIamCache();

    let caught: unknown;
    try { await extractDNA("test", "2026-11-13"); }
    catch (e) { caught = e; }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/watsonx: model returned non-JSON/);
  }));
});

# PopUp Detroit

PopUp Detroit helps entrepreneurs explore Detroit spaces for pop-up businesses and events. It combines AI-assisted business requirements, property discovery, deterministic matching, and a viability planning tool.

## Application

- Business DNA: turn a business description into structured requirements, then review and edit them.
- Opportunity Engine: screen, classify, score, and rank properties using pure functions in `src/lib/matching/`.
- Explore properties through cards, a map, and individual detail pages.
- Submit property inquiries and owner listings through server functions.
- Import source-linked property data through a passcode-protected admin flow.
- Explore planning assumptions in the Viability Lab.

Property facts must remain source-linked. Unknown values stay unknown; AI does not determine eligibility or matching scores.

## IBM technology and development evidence

The server provider layer in `src/lib/ai.server.ts` supports IBM watsonx.ai, including IAM token exchange, structured extraction, and provider error handling. With `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` configured, it selects watsonx.ai. The code also retains Lovable and OpenAI provider paths.

See [IBM Bob development evidence](docs/evidence/ibm-bob/README.md) for sanitized local edit records and the remaining screenshot checklist. Provider code demonstrates IBM integration; the development records document Bob-associated edits. The evidence notes explain their limits.

## Run locally

Install a Node.js version supported by the locked dependencies, then:

```sh
npm ci
# Only if .env does not already exist:
cp -n .env.example .env
npm run dev
```

Populate your local `.env` with your own configuration. Database-backed features require the project's Supabase setup. AI features require a configured provider; automated provider tests use mocked requests and need no live keys. Set `WATSONX_MODEL` to a chat model available in your watsonx.ai project and region; the example mirrors the code default, not a guarantee of regional availability.

Only the Supabase URL and publishable key belong in `VITE_*` variables. IBM keys, service-role keys, import passcodes, and other private credentials must stay server-side. `.env` and credential files are ignored; `.env.example` contains placeholders only.

```sh
npm test
npm run build
```

## Project structure

| Path | Purpose |
| --- | --- |
| `src/routes/` | Business intake, matching, properties, owner submissions, imports, viability |
| `src/lib/matching/` | Matching engine and regression tests |
| `src/lib/ai.server.ts` | AI providers and structured business extraction |
| `src/lib/api.functions.ts` | Server functions for application data |
| `src/integrations/supabase/` | Database clients and integration |
| `drizzle/` | Existing database schema and migrations |
| `public/templates/` | Property import template |
| `docs/evidence/ibm-bob/` | Sanitized Bob development records |

## Development history

The application was initially built with [Lovable](https://lovable.dev). This clean repository snapshot restores the complete application from local recovery commit `555199a` while excluding previous credential-bearing history. Original history and Bob Git notes are retained in the local backup repository; they must not be pushed with this clean branch.

The app remains connected to its [Lovable project](https://lovable.dev/projects/cf146b1e-229e-42cf-918a-666d258ec803). Follow `AGENTS.md` for project rules, including Lovable-managed database and generated files.

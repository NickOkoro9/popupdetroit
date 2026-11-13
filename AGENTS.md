<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (PopUp Detroit)
- Matching logic lives only in `src/lib/matching/` as pure functions (screen → statusFor → score → rank); UI and AI never compute eligibility or scores. Why: keeps the engine testable and editable independently (IBM Bob work).
- AI calls live in `src/lib/ai.server.ts` behind small functions with strict JSON schemas; swap the provider there. Why: one place to move to another model provider.
- Property records must be real and source-linked; unknown values stay null and are never estimated or converted (e.g. long-term $/SF/yr is never turned into a short-term price). Why: product trust requirement.
- Inquiries and owner submissions are written only through server functions with the admin client; those tables have no public policies. Why: no auth in MVP, and private contact data must not be readable.
- Property import is gated by the `ADMIN_IMPORT_PASSCODE` server secret. Why: lightweight admin protection without accounts.
- Tests for matching rules live next to the engine (`engine.test.ts`); run `bunx vitest run src/lib`.

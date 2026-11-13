# IBM Bob development evidence

This folder preserves a sanitized export of local development records found in `refs/notes/bob`. The note is attached to recovered application commit `555199aaf355265bd515f6b7dd38f77286663ed1`; the note-history commit is `9b1efcb7f093c419f959671f913ab2646e63b81e`.

The records contain **49 edit events across 7 application files**: 28 `apply_diff` events and 21 `write_file` events. Their timestamps run from **November 13, 2026, 2:55:09 PM to 4:53:39 PM America/Detroit**. The JSON export stores UTC timestamps.

## Recorded files

| Repository file | Recorded edit events |
| --- | ---: |
| `src/lib/ai.server.ts` | 23 |
| `src/lib/ai.provider.test.ts` | 11 |
| `src/lib/matching/vintage-clothing.test.ts` | 8 |
| `vite.config.ts` | 3 |
| `src/routes/match.tsx` | 2 |
| `src/lib/dna-normalization.test.ts` | 1 |
| `src/lib/requirements-store.tsx` | 1 |
| **Total** | **49** |

The recorded paths correspond to the recovered app's AI provider implementation, provider tests, matching and normalization regression tests, requirements state, matching page, and development configuration. Event counts describe recorded operations, not independent features, commits, or lines of code.

## Export and limitations

[`ibm-bob-events.json`](ibm-bob-events.json) keeps only each event's ID, operation, repository-relative file path, and timestamp, plus the source note and commit references. Absolute local paths, local branch metadata, historical line ranges, and null task identifiers were omitted. No prompts, source-code contents, environment files, or credential values are included.

These are local records from a Git notes ref named `bob`. They support the project's development account but are not independently authenticated proof of authorship. They do not contain the original Bob conversation, screenshots, or a verified successful live IBM service call. The recovered code and tests provide separate implementation evidence; their presence alone does not establish which tool authored them.

The original note remains in the preserved local repository. Its old commit IDs are provenance references, not commits added to the clean publication history. Exporting these records as ordinary files makes them reviewable without publishing the earlier repository history.

## Add visual evidence

Capture genuine screenshots from IBM Bob and the app, then add them to this folder with short factual captions:

1. **Bob conversation:** show the PopUp Detroit project and a relevant request plus Bob's response about one of the recorded files.
2. **Bob change review:** show the resulting diff or file changes for that same request, with the file name visible.
3. **Validation:** show the actual test command and completed result. Include counts only after running the tests; this export does not assert a passing result.
4. **App demonstration:** show the relevant feature working, such as Business DNA extraction from a sample business brief. If identifying the provider as IBM watsonx.ai, capture a real successful IBM-backed run.

Before saving screenshots, close `.env` and any credential settings, and keep secrets and private contact information outside the captured area. Use captions that identify what the image actually shows and when it was captured. Do not label a recreated interaction as the original development session.

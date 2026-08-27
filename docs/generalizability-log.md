# Generalizability Log

The camp app kept this ledger toward a multi-*community* SaaS; All Hands keeps the
same practice toward a multi-*kitchen* one. A **running ledger of everything
single-kitchen, single-caterer, or Daniel/festival-specific** in the codebase —
the requirements source for the multi-tenant foundation, captured from reality
as it's built rather than guessed later.

## Maintenance protocol — for Claude (automatic, every iteration)

Whenever you write or read code that hardcodes a kitchen-, caterer-, supplier-
or locale-specific value, or assumes there is only one kitchen/board, **add a
row before you finish the task**. Log it, don't necessarily fix it — All Hands
ships single-kitchen until the product questions (auth, tenancy) are decided.
Prefer config-first when you do touch one. Mark **Status**: `open` ·
`good-pattern` · `done`.

## Ledger

| Date | Area / `file` | What's single-kitchen / specific | Suggested approach | Status |
|---|---|---|---|---|
| 2026-08-26 | `app/api/kitchen-list/route.ts` `KEYS` | Exactly one board: two hardcoded `page_content` keys (`catering_kitchen_state` + `_test`) | Kitchen becomes an entity; keys become `kitchen:<id>:state`; the closed allow-list pattern stays (it's the injection guard) | open |
| 2026-08-26 | Both API routes | **No auth** — open write endpoint + open money-spending endpoint, carried over from the unlisted-probe posture | The founding product thread: caterer identity (owner + invited crew?) then gate both routes; camp app's Clerk pattern is the default answer | open |
| 2026-08-26 | `public/kitchen.html` `blank()` | New-board seed groups are "Volunteers" / "Production artists" — Daniel's festival's two audiences | Seed from onboarding input; groups are already data everywhere else (nothing in the code knows the words) | open |
| 2026-08-26 | `public/kitchen.html` cart export (`PRODUCT_URL`) | Wholesale Club is *the* supplier — hardcoded product-URL base, "item #" means their SKU | Supplier becomes config once a second real supplier exists; the shelved camp-repo price book is the reference if supplier-scoped SKUs return (as shape v7) | open |
| 2026-08-26 | `public/kitchen.html` units + `api/kitchen-ai` prompt | Units hardcoded lb/oz/pc (16 oz = 1 lb baked into math and prompt) | Locale/unit config when a metric kitchen shows up; keep the strict unit-class matching pattern | open |
| 2026-08-26 | `lib/state-store.ts` | Whole-document last-write-wins sync — fine for one kitchen's few devices, wrong for big crews | Per-field writes / op-based sync; the assistant's ops vocabulary is already halfway to the op log | open |
| 2026-08-26 | `data/fixtures/board-2026-08-26.json` | Dev fixture is Daniel's real (non-current) board | Fine — it's the best realistic fixture; replace with an anonymized sample if the repo ever goes public | good-pattern |

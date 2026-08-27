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
| 2026-08-26 | Both API routes | **No auth** — open write endpoint + open money-spending endpoint, carried over from the unlisted-probe posture | The founding product thread: caterer identity (owner + invited crew?) then gate both routes; camp app's Clerk pattern is the default answer | done — gated 2026-08-27 by the shared kitchen key (`lib/access.ts`); identity model still open, next row |
| 2026-08-27 | `next.config.js` rewrite | `/kitchen` is *the* board's address — one hardcoded clean URL for one kitchen | Becomes `/kitchen/<id>` (or per-tenant subdomain) when tenancy is decided; the rewrite seam already separates URL from file | open |
| 2026-08-27 | `lib/access.ts` + `public/kitchen.html` unlock screen | One shared `KITCHEN_ACCESS_KEY` = one kitchen, one role — no per-person identity, no revocation short of rotating the key and re-telling the crew | Per-kitchen keys, then real accounts (owner + invited shoppers) once tenancy is decided; the header+cookie seam and the 401→unlock flow carry over unchanged | open |
| 2026-08-26 | `public/kitchen.html` `blank()` | New-board seed groups are "Volunteers" / "Production artists" — Daniel's festival's two audiences | Seed from onboarding input; groups are already data everywhere else (nothing in the code knows the words) | open |
| 2026-08-26 | `public/kitchen.html` cart export (`PRODUCT_URL`) | Wholesale Club is *the* supplier — hardcoded product-URL base, "item #" means their SKU | Supplier becomes config once a second real supplier exists; the shelved camp-repo price book is the reference if supplier-scoped SKUs return (as shape v7) | open |
| 2026-08-26 | `public/kitchen.html` units + `api/kitchen-ai` prompt | Units hardcoded lb/oz/pc (16 oz = 1 lb baked into math and prompt) | Locale/unit config when a metric kitchen shows up; keep the strict unit-class matching pattern | open |
| 2026-08-26 | `lib/state-store.ts` | Whole-document last-write-wins sync — fine for one kitchen's few devices, wrong for big crews | Per-field writes / op-based sync; the assistant's ops vocabulary is already halfway to the op log | done — op-based sync landed 2026-08-27 in two phases: every edit is an op through `commit()` (shape v7 ids), and the wire is a rev'd compare-and-swap with 409→rebase + the `board_ops` audit log (migration 002) |
| 2026-08-27 | `board_ops.actor` + `actorId()` in `public/kitchen.html` | The op log's "who" is an anonymous per-device id (`dev-…` in localStorage) — no per-person identity, indistinguishable devices after a localStorage clear | Joins the identity/tenancy product thread (owner + invited crew); when accounts exist, actor becomes a user id and the column needs no schema change | open |
| 2026-08-27 | `board_ops.board_key` | The audit log inherits the two hardcoded `page_content` keys | Follows the `kitchen:<id>:state` key scheme whenever tenancy lands — same row as the KEYS allow-list above | open |
| 2026-08-27 | `state.ingredients` (v8) | Ingredients + aliases are **per-board** — every kitchen re-teaches "pasta sauce = tomato sauce"; no shared product catalog, no supplier linkage beyond the one SKU book | A tenant-level (later: global) ingredient/product catalog seeded from boards; per-ingredient supplier records fold in the shelved camp-repo price book | open |
| 2026-08-27 | `unitClassOf` + merge guard | Unit model is two hard classes (weight/count) with no bridge — lb-Bacon and pc-Bacon stay two ingredients; per-piece weight deferred by decision | Optional `pcWeight` (oz per piece) on the ingredient enables cross-class merge + depletion; touches every quantity path, needs its own quantity-identity pass | open |
| 2026-08-26 | `data/fixtures/board-2026-08-26.json` | Dev fixture is Daniel's real (non-current) board | Fine — it's the best realistic fixture; replace with an anonymized sample if the repo ever goes public | good-pattern |
| 2026-08-26 | `public/kitchen.html` styles + `public/fonts/TokyoDreams*.otf` | The visual identity is now the **camp app's** (Glåüm's palette, fonts, ✦ register), copied in rather than themed — the two products are visually coupled by duplication | If All Hands ever needs its own face (or the camp rebrands), the page's CSS custom properties are the theme seam — the token layer swaps cleanly, as this restyle itself proved | open |

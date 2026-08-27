# QA Log

Running record of QA sweeps: what was tested, what was fixed, and — most
useful for the next tester — what is *known and deliberate* so it doesn't get
re-reported, plus where the remaining risk lives. Newest sweep first.
(Same format as the camp repo's `docs/qa-log.md`.)

## Camp visual language — 2026-08-26 (`ux/camp-visual-language`)

Full restyle of `public/kitchen.html` to the camp app's design language (her
call, reversing the extraction-day "stands alone" direction) — tokens, fonts,
background layers, ornaments; layout grids untouched. Verified:

- `scripts/verify-quantities.mjs` vs the camp page over the live fixture —
  IDENTICAL before and after (CSS/markup-only change, no state or math).
- Browser pass on all three tabs + assistant drawer with real seeded data.
- Mobile at 390px via an iframe harness (masthead, chips, syncbar checked;
  two wrap bugs found and fixed: eyebrow ✦ orphan, sync-dot stranding).
- Print CSS extended (ornaments stripped, `color-scheme` flipped) — reviewed
  in CSS, not physically printed.

**Known and deliberate:** numerals stay monospace inside the serif body;
native controls render dark via `color-scheme: dark`; the SKU field got real
field styling (it was unstyled/UA-white before — pre-existing, invisible on
the old paper palette).

## Next 16 upgrade — 2026-08-26 (`chore/next-16`)

`npm audit` flagged 2 high-severity trees: next@14.2.35 (21 advisories, fixed
only in 16.x) + transitive postcss. Upgraded next 14.2.35 → 16.3.3, react
18 → 19.2.8 (+types). Zero code changes needed — both route handlers and the
config passed as-is. Verified: `npx tsc --noEmit` clean; clean `next build`
(note: the first build after the version jump fails on a stale `.next` —
`rm -rf .next` first); dev-server smoke (page title, GET seed, PUT round-trip
on `?scope=test`, `/` → 307 `/kitchen.html`); `npm audit` → 0 vulnerabilities.
The assistant route is SDK-only (no Next surface) — not re-smoke-tested
against the live API.

## Extraction smoke test — 2026-08-26 (repo genesis)

The board was ported byte-faithful from the camp app (only `<title>`/eyebrow
rebranded), so its behavior record carries over. Verified at extraction:

- `npx tsc --noEmit` clean; `next build` clean.
- Dev server: `/kitchen.html` loads, GET `/api/kitchen-list` seeds from the
  fixture and returns the board, PUT round-trips through the file store.
- `npm run verify-quantities` — the ported page against the camp repo's page,
  over the 2026-08-26 live-state snapshot: identical rows.

**Known and deliberate (inherited — don't re-report):**
- Empty pantry rows are auto-created per menu item — normal, not clutter.
- Close-out assumes planned = cooked; pantry-covered items never draw down
  unless crossed off at bought-0 (spec → Open threads).
- The assistant mic is hidden in Firefox (Web Speech API feature-detect).
- Assistant structured-outputs deliberately NOT used (grammar compilation
  timed out; prompt-JSON + page-side revalidation is the design).

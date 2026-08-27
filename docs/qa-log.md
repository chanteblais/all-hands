# QA Log

Running record of QA sweeps: what was tested, what was fixed, and — most
useful for the next tester — what is *known and deliberate* so it doesn't get
re-reported, plus where the remaining risk lives. Newest sweep first.
(Same format as the camp repo's `docs/qa-log.md`.)

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

# All Hands

**All Hands** is a catering-operations product: model service
days, meals, groups, headcounts, portions and buffers; aggregate the selected
days into one shopping trip; subtract the standing pantry; shop collaboratively
and close the trip back into inventory; make fast voice-driven changes with
human review before anything applies. Extracted from the Glåüm camp app
(`~/Projects/glaum-camp-website`) on 2026-08-26, where it started life as the
"kitchen board" probe — this repo inherits that app's architecture and working
conventions, adapted below.

**Stack:** Next.js 16 (App Router) · TypeScript · Supabase (Postgres) with a
file-backed dev fallback (`lib/state-store.ts`) · Vercel (when deployed).
**The product surface is one self-contained static page**, `public/kitchen.html`
— no framework, no build — plus two API routes. That is deliberate; see
`docs/architecture.md` before "modernizing" it.

## Read before touching anything structural
- `docs/kitchen-board.md` — the board spec: shape, migrations, sync, security posture
- `docs/architecture.md` — storage seam, routes, auth posture, why-static
- `docs/branching.md` — branching + parallel-session rules

## Conventions (ported from the camp repo — these are house law)

- **Branch before your first edit.** `type/slug` (`feat/` `fix/` `ux/` `docs/`
  `chore/`) or `session/YYYY-MM-DD-<topic>`. `main` = deployable; merge
  `--no-ff` after verifying (`npx tsc --noEmit` + click-through), delete the
  branch. Tiny tweaks straight to main need `ALLHANDS_ALLOW_MAIN=1` (pre-commit
  hook; fresh clones run `git config core.hooksPath .githooks` once).
- **Parallel sessions:** one checkout = one git-active session; a second
  session takes a `git worktree`. Never `git add -A` in the shared checkout.
  Full rules: `docs/branching.md`.
- **Docs before commit:** every commit folds its docs in — `docs/database.md`
  (tables + migrations ledger), `docs/architecture.md` (routes/seams),
  `docs/features.md`, the relevant spec (`docs/kitchen-board.md`), and
  `docs/generalizability-log.md` — same commit as the code they describe.
- **Print migrations:** any new/changed migration gets its full SQL printed
  verbatim in the chat summary, with a destructive-or-not note. Chante reviews
  and applies migrations herself and must never need to switch branches to
  read one.
- **Generalizability log:** All Hands is dogfooding toward a multi-kitchen product.
  Whenever you hardcode or encounter a single-kitchen / single-caterer /
  Daniel-or-festival-specific value, append a row to
  `docs/generalizability-log.md`. Log it, don't necessarily fix it.
- **Review server:** after implementing, start the dev server on a free port
  (walk 3001+, check LISTEN first), leave it running, and give Chante the
  clickable URL + a per-page review checklist + which branch/checkout it
  serves. **Port 3000 is Chante's — never start or stop anything on it.**
  Kill your server after merge, by port-specific PID only.
- **Mobile always:** every UI change gets the ~380px pass in the same
  iteration, unprompted. The board is used one-handed in warehouse aisles.
- **Push policy:** Claude may push `main` once Chante confirms ("looks good" /
  "merge it" covers the deploy); verify docs are current and migrations
  applied first. Check `git log --first-parent origin/main..main` before
  pushing. (No remote is configured yet — creating it is hers.)

## The board's own rules (from its life in production)

1. **Never point a dev page at the live board.** The page defaults to a
   scratch board on localhost (`?scope=test`, "SCRATCH BOARD" banner); live
   from dev takes an explicit `?scope=live` and you should almost never need it.
2. **Snapshot before writing to a deployed board's state**
   (`curl -s <url>/api/kitchen-list > backup.json`). If something unexpected
   is there, find out whose it is before overwriting.
3. **Any shape change must be quantity-identical.** Run
   `npm run verify-quantities -- <before.html> <after.html> <state.json>`
   against a copy of real state before shipping. Two traps: `migrate()` has
   multiple exits that each pin a version, and `payload()` lists fields
   explicitly — miss it and every save silently drops the new field.
4. **Portions are guesses; menus are facts.** Per-person amounts are planning
   defaults; dish names, days, groups and headcounts come from the caterer.
   Never silently "correct" a value the caterer has set.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

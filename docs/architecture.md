# Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Supabase (Postgres) ·
Vercel. Inherited from the camp app the product was extracted from
(2026-08-26); kept because it is proven, boring, and lets code move between
the two repos with minimal translation. (One divergence, day one: the camp
app pins Next 14, which carries a pile of high-severity advisories fixed only
in 16 — this repo upgraded immediately while the surface was two route
handlers; the camp app's upgrade is its own, bigger job.)

## Why the product surface is a static page

`public/kitchen.html` is one self-contained HTML file — no framework, no
build, no hydration. This was a deliberate choice in the camp app and it
survives the extraction on its merits:

- The board is used on phones in warehouse aisles and busy kitchens: one
  request, instant load, works as a saved file if the network dies.
- The whole UI is one shared mutable document (the board state) rendered from
  scratch on every change — exactly the case where a framework's component
  model buys least.
- Its state migrations (`migrate()` in the page) and quantity math have a
  headless test harness (`scripts/verify-quantities.mjs`) that runs the page's
  own script under a DOM stub — a property that survives because the page has
  no build step.

Graduating surfaces to React is fine **when a surface needs what React buys**
(auth-gated shells, multi-kitchen navigation, server rendering). Don't rewrite
the board for tidiness; the static page is the reference implementation of the
product's math.

## The storage seam

`lib/state-store.ts` is the only module that knows where state lives:

- **Supabase** (`page_content` table, see `database.md`) whenever
  `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set. Access via
  `lib/supabase.ts` — lazy Proxy clients, so missing env vars don't break the
  build (camp-app pattern).
- **File fallback** (`.data/<key>.json`, gitignored) when they aren't — local
  dev on a fresh clone. The live key's first read seeds from
  `data/fixtures/board-2026-08-26.json` (a real board: 4 service days, 49
  shopping rows). Refused in production so a misconfigured deploy fails loudly
  rather than writing into an ephemeral serverless filesystem.

Server code → `state-store` (or `supabaseAdmin` for future tables directly);
client code → `fetch('/api/...')`. Same layering as the camp app.

## API routes

| Route | Methods | What it does |
|---|---|---|
| `/api/kitchen-list` | GET, PUT (POST = PUT for sendBeacon) | Board state read/write. Closed scope allow-list (`?scope=test` → scratch key; anything else → live key), shape validation, 200 KB cap. |
| `/api/kitchen-ai` | POST | The assistant drawer. Claude (`claude-opus-5`, effort low — extraction-shaped chat, latency matters), prompt-cached system prompt, per-IP rate limit, size caps. **Never touches the database**: the page sends state, the model proposes ops, the page previews and the caterer applies. **Spends money** — needs `ANTHROPIC_API_KEY`. |

## Auth posture — the top open thread

Both routes are **unauthenticated**, a carry-over from the board's life as an
unlisted probe for a caterer with no account (risk explicitly accepted by the
owner 2026-08-05, festival-scoped). What was a temporary posture in the camp
app is the founding product question here: `kitchen-list` is an open write
endpoint and `kitchen-ai` spends money for anyone who finds the URL.

**Before All Hands gets a real audience: add auth.** The camp app's pattern (Clerk,
`publicMetadata` roles, session-claims gating in a shared helper) is the
default answer when the time comes; what a *caterer's crew* identity model
looks like (owner + invited shoppers?) is a product decision that should
precede the library choice.

## Sync model (unchanged from the camp app)

Last-write-wins on the whole state blob: ~700 ms debounced save, 10 s poll,
`sendBeacon` flush on page hide, localStorage offline backup
(`catering-kitchen-backup-<scope>` on the page's origin — a real recovery path,
proven in the 2026-08-05 incident). Fine for a single kitchen's handful of
devices; revisit if kitchens ever get big crews (per-field writes are the
known upgrade, see the spec).

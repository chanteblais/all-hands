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

Both routes are gated by the shared kitchen key (below); everything else about
them is unchanged.

| Route | Methods | What it does |
|---|---|---|
| `/api/kitchen-list` | GET, PUT (POST = PUT for sendBeacon) | Board state read/write. Kitchen-key gated. Closed scope allow-list (`?scope=test` → scratch key; anything else → live key), shape validation, 200 KB cap. |
| `/api/kitchen-ai` | POST | The assistant drawer. Kitchen-key gated. Claude (`claude-opus-5`, effort low — extraction-shaped chat, latency matters), prompt-cached system prompt, per-IP rate limit, size caps. **Never touches the database**: the page sends state, the model proposes ops, the page previews and the caterer applies. **Spends money** — needs `ANTHROPIC_API_KEY`. |

## Auth posture — the kitchen key (since 2026-08-27)

Both routes require a single shared **kitchen key** (`lib/access.ts`):
`KITCHEN_ACCESS_KEY` in the environment, presented by the page as an
`x-kitchen-key` header on fetches plus a `kitchen_key` cookie — the cookie is
what keeps the pagehide `sendBeacon` flush authenticated, since beacons can't
carry headers. A missing or wrong key gets 401 and the page shows an unlock
screen; the key is remembered per device (`localStorage`), so the crew types
it once. Comparison is constant-time over SHA-256 digests. With no key
configured, local dev stays open (a fresh clone just works, same spirit as the
file-backed store) and **production refuses with 503** — a deploy that forgot
the env var fails closed instead of silently reverting to the old open posture.

This closes the founding gap (`kitchen-list` was an open write endpoint,
`kitchen-ai` spent money for anyone with the URL — risk accepted 2026-08-05
while festival-scoped) at link-with-a-key strength, and that is all it does:
one key, one role, no identities. What a *caterer's crew* identity model looks
like (owner + invited shoppers?) is still the product decision that should
precede a real identity system; the camp app's pattern (Clerk,
`publicMetadata` roles, session-claims gating in a shared helper) remains the
default answer when that time comes, and the header+cookie seam and
401→unlock flow carry over to it.

## Sync model (unchanged from the camp app)

Last-write-wins on the whole state blob: ~700 ms debounced save, 10 s poll,
`sendBeacon` flush on page hide, localStorage offline backup
(`catering-kitchen-backup-<scope>` on the page's origin — a real recovery path,
proven in the 2026-08-05 incident). Fine for a single kitchen's handful of
devices; revisit if kitchens ever get big crews (per-field writes are the
known upgrade, see the spec).

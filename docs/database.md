# Database

Supabase (Postgres). Two tables — the state store and its op audit log. In
local dev with no Supabase env vars, the same keys live as files under
`.data/` instead (see `architecture.md` → The storage seam).

## Tables

### `page_content`

One JSON string per key. Same table shape as the camp app's `page_content`, so
the cutover copy of the board's row needs no translation.

| Column | Type | Notes |
|---|---|---|
| `key` | text, PK | |
| `value` | text | JSON string (the board state — see `kitchen-board.md` for the shape, currently v8: adds `ingredients` + per-row `ingredientId`; no SQL change — shape versions live in the blob) |
| `updated_at` | timestamptz, default now() | set by the API on every write |
| `rev` | bigint, default 0 | revision counter (002) — the checked PUT is a compare-and-swap on it; a stale `baseRev` gets 409 and the page rebases |

In file-fallback mode the file becomes `{"rev": n, "state": ...}` on first
write; a bare legacy file reads as rev 0.

### `board_ops` (002)

Append-only record of every applied write batch — the ops, which device sent
them, and through which channel. **Advisory: the blob in `page_content` stays
the source of truth.** The row insert happens after a successful
compare-and-swap and is best-effort (not atomic with the state write; a lost
audit row is the accepted worst case — the race loser never inserts at all).
Legacy no-`baseRev` writes are logged as a `[{"op":"replace_state"}]` marker so
every rev transition stays accounted for. File-fallback equivalent:
`.data/<key>.ops.jsonl`.

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial, PK | |
| `board_key` | text | the `page_content` key written |
| `rev` | bigint | the revision this batch produced |
| `ops` | jsonb | the op batch (each op carries a `source` tag: ui / ai / closeout / boot-replay) |
| `actor` | text | per-device id (`dev-…` from localStorage) — no accounts yet, see the generalizability log |
| `source` | text | wire channel: `ui` (debounced save), `beacon` (pagehide flush), `legacy` (no-baseRev overwrite) |
| `created_at` | timestamptz, default now() | |

**Keys in use:**

| Key | What |
|---|---|
| `catering_kitchen_state` | The live board |
| `catering_kitchen_state_test` | The scratch board (`?scope=test`, default on localhost) |

The key names carry their camp-app history; renaming them is cosmetic and not
worth a migration until a real multi-kitchen key scheme exists (at which point
the key becomes something like `kitchen:<id>:state` — see
`generalizability-log.md`).

## Migrations ledger

Files in `migrations/`, applied by Chante in the Supabase SQL editor. Board
*shape* versions (v1…v6) are not SQL migrations — the page migrates state
forward on load (`migrate()` in `public/kitchen.html`); see `kitchen-board.md`.

| # | File | What | Destructive? |
|---|---|---|---|
| 001 | `001_page_content.sql` | Create `page_content` | No |
| 002 | `002_rev_and_board_ops.sql` | `rev` counter on `page_content` + create `board_ops` | No |

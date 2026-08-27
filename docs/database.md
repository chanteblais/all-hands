# Database

Supabase (Postgres). One table so far — the state store. In local dev with no
Supabase env vars, the same keys live as files under `.data/` instead
(see `architecture.md` → The storage seam).

## Tables

### `page_content`

One JSON string per key. Same table shape as the camp app's `page_content`, so
the cutover copy of the board's row needs no translation.

| Column | Type | Notes |
|---|---|---|
| `key` | text, PK | |
| `value` | text | JSON string (the board state — see `kitchen-board.md` for the shape, currently v6) |
| `updated_at` | timestamptz, default now() | set by the API on every write |

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

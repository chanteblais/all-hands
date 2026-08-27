# Features

What the product does today. One surface: the kitchen board
(`/kitchen`; `/` and the old `/kitchen.html` redirect there — the file is
still `public/kitchen.html`, only the URL is clean). Full mechanics in
`kitchen-board.md`.

## The board

**For:** a caterer planning and shopping multi-day service — on a laptop while
planning, on a phone in the aisle.

### Menus tab
Days → groups (label + headcount) and meals (Brunch/Dinner/…) → sections
(courses) → items. Every item carries `per` (per-person amount), unit, an
optional pack size, and the `groupIds` that eat it — assignment *is* the
arithmetic (`per × Σ assigned headcounts × (1 + buffer)`). An item assigned to
nobody drops off the shopping list, shown dimmed rather than silently gone.
Course-level quick-set ("all of this course → group / everyone"). Add-day
copies an existing day.

### Shopping list
Aggregates every **selected** day into one trip, matched by item name + unit
class; per-row day/meal breakdown; pack hints ("3 × 4 lb bag"). Check-offs are
trip-scoped (name+unit-keyed, shared across devices). The **SKU book** (v6):
an "item #" field per row, stored centrally so one product can't carry two
disagreeing numbers, and **Cart list → clipboard** — pack counts, item
numbers, and Wholesale Club product links; rows missing a SKU or pack size are
named, not dropped.

### Pantry tab
A standing ledger (name, qty, lb|pc) owned by the kitchen, not by any day.
Matched to shopping items by name + compatible unit and subtracted **once**
from the combined trip. Off-menu items persist ("not on this list"). A row is
auto-created per menu item, so a zero row is normal, not clutter.

### Finish shop (close-out)
Preview table (in pantry / bought / used / left), then writes crossed-off rows
back into the pantry (`now + bought − used`, floored at 0, shortfalls flagged),
clears checks, unticks days. Known honesty gaps: it assumes planned = cooked,
and pantry-covered items never draw down unless crossed off at bought-0 — see
the spec's open threads.

### The assistant (drawer)
Dictation-friendly chat (`/api/kitchen-ai`): in-drawer mic (Web Speech API,
feature-detected — hidden in Firefox), minimized state that force-expands on a
pending preview. The model returns a reply + proposed ops (`set_pantry`,
`set_headcount`, `check_item`, …); the page resolves them against **current**
state into a before/after preview; nothing mutates until Apply. Portions stay
the caterer's by construction — the prompt forbids unrequested changes to
`per`/buffer/headcounts. **Keep every new capability on this rail.**

### Scopes
On localhost the page defaults to the scratch board (`?scope=test`, banner);
`?scope=live` is explicit. Print view strips checked rows and chrome.

### The kitchen key (2026-08-27)
Both API routes require a shared key (`KITCHEN_ACCESS_KEY`). First visit on a
device shows an unlock screen; the key is remembered there after that, so the
crew types it once and never sees a sign-in mid-shop. Local dev with no key
set stays open. Mechanics in `architecture.md` → Auth posture.

## Shipped history (in the camp app, pre-extraction)

Board v1→v6 (2026-08-04 → 2026-08-26): single list → pantry ledger →
multi-day → per-group menus → meals + per-item assignment → SKU book + cart
list. Assistant + mic shipped 2026-08-05. Price book + by-supplier lens built,
then **shelved** 2026-08-06 (parked in the camp repo:
`feat/kitchen-prices`/`feat/kitchen-order`; reviving them here means
renumbering their shape to v7 — sku took v6). Proven in the field: four
service days, ~800 covers, real shopping runs.

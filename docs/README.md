# All Hands — Design Docs

Same documentation flow as the camp app this project was extracted from: specs
live here, and **docs ride in the same commit as the code they describe**
(the docs-before-commit sweep in `CLAUDE.md`).

| Doc | What's in it |
|---|---|
| [Architecture](architecture.md) | Stack, the storage seam, all API routes, auth posture, why the product surface is a static page |
| [Database](database.md) | Tables, `page_content` keys, migrations ledger |
| [Features](features.md) | What the board does today — every tab and flow |
| [Design System](design-system.md) | The board's palette (light + dark), type, voice |
| [Kitchen Board spec](kitchen-board.md) | The full spec inherited from the camp repo: state shape, shape-migration history, sync, security posture, open threads |
| [Wholesale Club cart](wholesale-club-cart.md) | Cart-API research: findings, risks, the bookmarklet architecture (second half of cart export, unbuilt) |
| [Branching](branching.md) | Branching + parallel-session rules, commit guards |
| [Generalizability Log](generalizability-log.md) | Running ledger of single-kitchen / single-caterer assumptions — feeds the multi-kitchen foundation |
| [QA Log](qa-log.md) | QA sweeps: tested, fixed, known-and-deliberate |
| [UX Review Log](ux-review-log.md) | UX findings (`proposed` → decided → `fixed`) |

## Project direction

One caterer (Daniel) proved the board in the field; the open product questions
are auth (the board is deliberately unauthenticated today), multi-kitchen
tenancy, and the second half of cart export. When building, read
[generalizability-log.md](generalizability-log.md) before hardcoding anything
kitchen- or caterer-specific — log what you can't avoid.

There is no separate session brief to paste: `CLAUDE.md` at the repo root is
the brief, loaded automatically every session.

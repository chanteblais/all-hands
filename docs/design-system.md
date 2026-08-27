# Design System

**All Hands shares the camp app's visual language** (Chante's call, 2026-08-26,
reversing the extraction-day "stands alone" direction): the board now reads as
a sibling of glaum-camp-website — nocturnal ink, gold, purple, the ✦ ornament
register — while keeping its utilitarian bones (monospace numerals, editorial
list structure, print-first shopping list). The camp repo's
`docs/design-system.md` is the upstream reference; this doc records how it
lands here.

## Palette (CSS custom properties in `public/kitchen.html`)

One theme — the camp look is deliberately nocturnal. Print (below) is the
light mode.

| Token | Value | Use |
|---|---|---|
| `--ground` | `#1A0A24` | page ink (plus body layers: purple radial glow at top-center, plum mid-gradient, fixed gold dot-grid via `body::before`) |
| `--card` | `rgba(255,255,255,0.04)` | panels/cards (translucent over ink) |
| `--panel-solid` | `#251232` | opaque surfaces that overlay content (assistant drawer) |
| `--ink` | `#F3EDE6` | body text (warm off-white) |
| `--muted` | `rgba(243,237,230,0.55)` | secondary text, hints |
| `--line` | `rgba(200,168,72,0.22)` | gold hairlines, field borders |
| `--gold` / `--accent` | `#C8A848` | headings, active states, primary buttons (ink text: `--accent-ink`) |
| `--purple` | `#D239F8` | focus rings (all `:focus-visible`), glow accents |
| `--lavender` | `#D9B3FF` | "busy" sync dot, light accents |
| `--hl` | `rgba(200,168,72,0.26)` | quantity pills on the shopping list |
| `--chip-v` / `--chip-pa` | `#5D2B7A` plum / `#2F6D68` teal | group chips (seed pair; cream `--chip-ink` text) |
| `--danger` | `#ff8a8a` (borders `--danger-line` `rgba(255,80,80,0.45)`) | destructive, shortfalls, scratch badge |

`color-scheme: dark` is set so native controls (checkboxes, selects) render
dark; print flips it to light.

## Type

| Face | Source | Use |
|---|---|---|
| TokyoDreams | local `/fonts/TokyoDreams*.otf` (copied from the camp repo) | the `h1` masthead |
| Libre Baskerville | Google Fonts | body serif |
| system-ui | — | controls, tabs, tracked micro-labels |
| Menlo/Consolas mono | — | every numeral cell (quantities, headcounts, prices) — kitchen legibility beats purity |

Headings are gold with the camp text-shadow (`0 2px 8px rgba(0,0,0,0.8)`).
Eyebrows/section heads: uppercase, tracked `0.14–0.26em`, gold, led by a `✦`.

## Motifs

- **`.gold-rule`** — hairline gold gradient with a centered ✦ (under the masthead).
- Section heads and the assistant header carry a `✦ ` prefix; the eyebrow is
  wrapped in ✦s.
- Buttons are pills: primary gold-on-ink, ghost cream/gold hairline, danger
  ghost in the red register. Focus is always the purple outline.
- The assistant fab is a gold pill with a faint purple glow.

## Print — the shopping list is a first-class printout

`@media print` flips to black-on-white: tokens overridden, Georgia serif,
TokyoDreams and every ornament (dot grid, gold rule, ✦ prefixes, shadows)
stripped, checked rows dropped. Never let a camp-language flourish survive
into print.

## Rules of thumb (unchanged by the restyle)

- **Mobile in the same pass** (~380–390 px): primary context is a phone held
  one-handed in an aisle. The ≤620px grid-area layouts predate the restyle
  and are proven — don't disturb them for visual polish.
- **Previews before mutations**: anything that changes state at a distance
  (assistant ops, close-out) shows a before/after and waits for a human.
- **Flag, don't hide**: unconfirmed or unassigned data stays visible, labeled.
- **Voice**: plain kitchen language, warm but terse; the ceremonial register
  lives in the chrome (headings, ornaments, the colophon), never in the rows
  the caterer reads mid-shop.

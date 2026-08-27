# Design System

All Hands's design language is the board's own — it grew utilitarian-editorial in
the field and that register is the brand: **a well-set worksheet, not an app.**
Deliberately *not* the camp app's ceremonial ink-and-gold; All Hands stands alone.

## Voice

Plain kitchen language, warm but terse. Name things, don't code them ("not for
Volunteers", never "excluded"). Empty states explain themselves and say what to
do next. Numbers are the content — typography serves legibility of quantities
first. The assistant replies in one or two short sentences, no markdown, and
reads suspicious magnitudes back ("Setting black beans to 12.5 lb").

## Palette (CSS custom properties in `public/kitchen.html`)

Warm paper + olive + market-stand green; automatic dark mode via
`prefers-color-scheme` (every token has a dark twin — never define a color
only on one side).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ground` | `#F4F2EA` | `#191B16` | page background |
| `--card` | `#FDFCF8` | `#22251E` | panels/cards |
| `--ink` | `#23261F` | `#E8E6D9` | text |
| `--muted` | `#6E7263` | `#9AA08D` | secondary text, hints |
| `--line` | `#D8D5C6` | `#3A3E33` | hairlines, borders |
| `--accent` | `#33714A` | `#7CC495` | actions, active states |
| `--accent-ink` | `#FFFFFF` | `#14201A` | text on accent |
| `--hl` | `rgba(244,214,76,.45)` | `rgba(244,214,76,.16)` | highlight (quantity pills) |
| `--chip-v` / `--chip-pa` | blue / purple | lightened | group chips (seed pair; chips are data-driven) |
| `--danger` | `#A04532` | `#D08A78` | destructive, shortfalls |

## Type & layout

System font stack (`system-ui, -apple-system, "Segoe UI"`) — instant load, at
home on every device. Masthead style: uppercase tracked eyebrow, heavy
tight-tracked `h1` with a thick underline. Max width 900 px, single column.
Number inputs strip spinners (they clipped right-aligned digits — half a "5"
reads as "!").

## Rules of thumb

- **Mobile in the same pass** (~380 px): the primary context is a phone held
  one-handed in an aisle. Static-page media queries live in the page's own
  `<style>`.
- **Print is a first-class view**: the shopping list prints clean — `no-print`
  on chrome, checked rows drop off.
- **Previews before mutations**: anything that changes state at a distance
  (assistant ops, close-out) shows a before/after and waits for a human.
- **Flag, don't hide**: unconfirmed data (a struck-through sheet item, an
  unassigned item) stays visible with a label.

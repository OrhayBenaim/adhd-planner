---
name: figma-workflow
description: >-
  ADHD Figma page semantics and frame↔flow map. Use when designing,
  implementing, syncing, or reviewing UI against Figma; when the user
  mentions Figma, Production, In progress, frames, or flows.
---

# Figma workflow

File: https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD (`uEKUhrvteSOfw9kRknd9I6`)

[`FIGMA.md`](../../../FIGMA.md) maps **frames to flows**. Read it to know which frame belongs to which journey — not to reconstruct history.

## Pages

| Page | Node | Meaning |
|------|------|---------|
| In progress | `71:12` | Unshipped design |
| Production | `71:13` | Shipped UI |
| Archive | `329:1611` | Superseded design, grouped by the date it left Production |

New product UI starts on **In progress**. **Production** is only for approved, shipped UI. Do not add pages.

Promoting is a replace, not an append: what the new design supersedes moves to
**Archive**, into a section named for the date of the move (`YYYY-MM-DD · <what>`).
An old frame with no counterpart in the new design is not superseded — it stays on
Production, because it is still what ships.

When promoting: move (or replace) the frame onto Production; if the Figma file uses comments to mark the delta, those comments live on the frame — not in `FIGMA.md`. Remove comments once the Production frame matches the app.

## FIGMA.md

A row is: **frame → flow** (the journey it belongs to, plus the code that owns that journey).

`FIGMA.md` is not a changelog, a status board, or a sync diary. It does not record what changed, what is “held”, which variant to prefer, visual notes, or unimplemented surfaces.

When a frame’s flow changes, or a new frame is the source for a step, update the map. Exploratory frames stay on In progress with no Production row.

## Do not

- Draft product UI on Production
- Archive an old frame before checking the new design actually replaces it
- Put change history in `FIGMA.md`
- Invent a frame→flow mapping without checking `FIGMA.md` and the matching flow in `apps/mobile`
- Delete Figma nodes unless asked

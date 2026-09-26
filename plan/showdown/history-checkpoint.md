# Checkpoint 2c — historic standings chart

- Full-width bottom row on `/stats/#showdown-history`, using the existing
  TanStack SVG renderer, chart theme, lazy mounting and purple tooltips.
- All 30 franchise groups, with the same historical-ID grouping as existing
  Stats charts. Only archived seasons and games between that season's candidate
  pair count. Wins/losses are summed before calculating percentage; this is not
  an average of seasonal percentages.
- Ranked horizontal bars, visible W–L/PCT labels, and full-name/game-count
  tooltips. No-game teams sort last with an em dash, distinct from 0%.
- Expandable server-rendered table exposes every record without JavaScript.
- Keyboard navigation follows the ranked visual order, not alphabetical tricodes;
  Home focuses the leader, arrows explore, Enter pins and Escape dismisses.

Verification: weighted/franchise/current-season-exclusion fixtures, all-data
win/loss balance across 30 groups, no-game descriptions and SVG/keyboard-order
checks. Browser tested at 1440px and 390px: all rows, no horizontal overflow,
working keyboard tooltip and no runtime exceptions.

Final full build/verification passed: dependency audit, Astro check,
formatting/lint/workflow checks, **248 tests across 34 files**, production build
and artifact audit (**409 files**). No database drift or uncommitted fake odds.

Review this new chart separately from the already approved season page layout.

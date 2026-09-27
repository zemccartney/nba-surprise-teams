# Checkpoint 2c — historic standings chart

- Full-width bottom row on `/stats/#showdown-history`, using the existing
  TanStack SVG renderer, chart theme, lazy mounting and purple tooltips. Ranked
  bars and a games-played (x) / win-percentage (y) scatter plot sit beside each
  other on wide screens and stack on narrow screens.
- All 30 franchise groups, with the same historical-ID grouping as existing
  Stats charts. Only archived seasons and games between that season's candidate
  pair count. Wins/losses are summed before calculating percentage; this is not
  an average of seasonal percentages.
- Ranked horizontal bars alternate the standard positive green and pale green,
  matching Surprises × Season. Bars have no overlaid labels; records remain in
  tooltips. The axis retains zero and rounds its maximum up to a quarter.
  Percentage ticks use the shared 16px bold, full-opacity lime chart-axis style.
- The shared subtitle is “Results of every surprise team candidate head-to-head”.
- Both charts share concise logo/name and `W–L | PCT (n games played)` content.
  Both include full name-era breakdowns immediately on hover; pinning is optional.
  Scatter tooltips render at document level with a 40px gap around the point.
  They prefer side placement where space permits, otherwise above/below, and
  may extend vertically beyond the chart/viewport rather than shift onto the dot.
  Width is capped to the viewport minus 32px (up to 32rem); normal page scrolling
  exposes long histories without another click. Scroll/resize placement includes
  the visual viewport, and teardown removes portal listeners and content.
  Scatter selection uses nearest centers so overlapping/focused circles cannot
  capture a neighboring dot's hover target. The subtitle is now 20px.
  Era totals are calculated from qualifying games in each inclusive season range;
  displayed end years include the final season's ending year. All era W/L sums
  are tested against franchise totals. Washington's Bullets/Wizards transition
  and repeated Charlotte/New Orleans eras remain separate runs.
- Both the Showdown scatter and the positive dots in Pace × Over/Under use
  standard positive green (the pace area's fill), not lime. Eliminated dots
  remain red; pace lines/threshold accents are unchanged.
- Scatter omits undefined percentages (no qualifying games), but retains real
  0% records. Axis ticks use whole game counts, and both plots are keyboard usable.
- The extra accordion/table was removed after visual review. Keyboard chart
  descriptions still expose each record. No-game teams sort last with an em dash,
  distinct from 0%.
- Keyboard navigation follows the ranked visual order, not alphabetical tricodes;
  Home focuses the leader, arrows explore, Enter pins and Escape dismisses.

Verification: weighted/franchise/current-season-exclusion fixtures, all-data
win/loss balance across 30 groups, no-game descriptions and SVG/keyboard-order
checks. Browser tested at 1440px and 390px: all rows, no horizontal overflow,
working keyboard tooltip and no runtime exceptions.

Final full build/verification passed: dependency audit, Astro check,
formatting/lint/workflow checks, **256 tests across 35 files**, production build
and artifact audit (**412 files**). No database drift or uncommitted fake odds.

Review this new chart separately from the already approved season page layout.

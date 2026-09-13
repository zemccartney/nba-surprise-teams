# R3–R5: chart failure handling and input handoff

D1/D3 have been reviewed and approved by Zack. This next batch fixes **R3, R4
and R5** locally. No push, deployment or additional commit; checkpoint remains
`4c3bc20`. Other test/tooling/deployment findings remain open, and Workers
provisioning remains migration work.

## Changes to review

- `src/components/charts/fonts.ts`: prefer loaded regular/bold fonts, but stop
  waiting after **1.5 seconds**. Rejections and synchronous font API errors fall
  back immediately. Clear the timer when finished. No font assets changed.
- `src/components/charts/echarts.ts`: use that bounded font-readiness helper;
  font availability is no longer a prerequisite for chart initialization.
- `src/components/charts/keyboard.ts`:
  - Pointer focus no longer activates the remembered keyboard point.
  - Clicking/tapping selects the corresponding original data index, updates
    the spoken value and focuses the chart without scrolling. Subsequent arrows
    start from that selection, including charts with reordered traversal.
  - Keyboard and pointer emphasis are handed off explicitly. This avoids both
    duplicate outlines and a missing outline when returning within the same dot.
    Pointer exit clears pointer-owned emphasis. Stacked team bars use their
    configured series pair consistently.
  - Escape dismisses hover tooltips even when focus is elsewhere. An open native
    popover/dialog or an already-prevented event retains precedence. Ordinary
    chart-focused Escape/Tab behavior remains intact.

Only emphasis/interaction and failure handling changed; the approved static
chart layout, colors, opacity and data corrections remain.

## Manual review at http://localhost:4322/

### Mixed input on Stats

1. Focus a navigation link, then hover a scatter point without clicking.
   Press Escape without moving the pointer: the tooltip should disappear.
   Its hover outline may remain until you move away.
2. Hover/click the high Phoenix Suns point (2013–14). Only that point should be
   outlined—not the initial Philadelphia point as well.
3. Press Right: the next point in traversal order should be the sole outlined
   point. Move the mouse back within Phoenix: the outline should return there.
4. Move between other dots and outside the chart. There should be no leftover
   outlines. Repeat with a tap followed by keyboard input where supported.
5. Repeat unfocused-hover Escape on the two bar charts and a team's pace chart.
6. Open a native information popover and press Escape. It should close normally,
   without that same key also dismissing an unrelated chart tooltip.

### Font failure

In browser DevTools, block font URLs (for example `*.woff2`), disable cache and
reload Stats and a team page. All charts should still render and support
keyboard navigation, using fallback font metrics. Restore request blocking
and reload afterward. The automated stalled-request test covers the timeout
case without depending on a particular network-throttling profile.

## Automated verification

```sh
mise x -- pnpm test
mise x -- pnpm run verify
env -u SENTRY_AUTH_TOKEN mise x -- pnpm run build
mise x -- node plan/baseline/chart-resilience.mjs --base http://localhost:4322
```

`tests/chart-fonts.test.ts` adds three cases covering successful regular/bold
loads, rejected/synchronously throwing loads, and never-settling loads with a
bounded wait and cleared timer. Total suite: **37 tests**. These font tests do
not depend on the Astro content store.

`chart-resilience.mjs` checks:

- Actual aborted and stalled font requests across all four charts, SVG mounting,
  keyboard values and absence of uncaught page errors.
- Unfocused hover Escape and native-popover precedence.
- Click selection and correct subsequent keyboard index.
- One outline at the actual hovered coordinates through keyboard/pointer
  handoff, movement between points, exit, and touch-to-keyboard handoff.

The existing `stats-tooltips.mjs` and `chart-parity.mjs` now also assert
unfocused-hover Escape across all four chart types at desktop/mobile widths.
Their prior decoded-image/node-reuse checks remain intact.

### Results

- Normal build/type/lint/format/tests passed: **37 tests**.
- Resilience probe passed against dev and built preview.
- Built-preview chart parity, Stats layout, tooltip/image stability, keyboard
  navigation and D1/D3 data-correction probes all passed.
- Dev was stopped afterward; built preview remains at port 4322.

The dedicated mixed-input sequence uses Chrome at desktop width, including
emulated touch; it is not a claim of physical-device or cross-browser coverage.
Manual screen-reader validation, the broader empty/stale content-test gap R2,
and live/hosted verification remain outstanding.

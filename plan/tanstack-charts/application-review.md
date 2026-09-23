# TanStack application review

**Accepted by Zack, 2026-09-21**, including all refinements through `48b4d5e`.
The follow-up cleanup removes ECharts, its custom controllers and obsolete
renderer-specific checks. Shared payload types now live in `data.ts`. No merge
or deployment has been performed.

Cleanup validation: **180 current tests**, full build/audits, application,
malicious-tooltip-fixture and blocked/stalled-font browser checks in dev and
built preview. The shared chart bundle and 24 dev/preview screenshots are
byte-identical to the approved version. The same browser checks also pass
under Astro/workerd preview. All test servers are stopped. See
[cleanup evidence](results/cleanup.json).

**Simplifications authorized and applied, 2026-09-23:** paints now reference CSS
variables directly; the extra font wait and dormant Astro router cleanup are
removed. TanStack renders with available fonts and remeasures when fonts load.
The expanded browser checks verify delayed successful recovery, selected-point
and focus preservation, resize, and live CSS-token updates. This is separate from
the byte-identical cleanup above. See the updated
[illustrated implementation guide](../../docs/tanstack-charts.html) and
[simplification evidence](results/simplification.json).

The actual Astro chart wrappers now mount **TanStack Charts 0.18.0**. Run the
normal `pnpm start` command on `tanstack-charts`, then review:

- `/stats/`: season bars, team results and scatter plot.
- `/2025/CHA/`: pace line, threshold fill and emoji.
- The same routes at mobile widths, with mouse and keyboard.

No separate prototype command or feature flag is required. There is no React
adapter or framework hydration. Inline JSON remains data; Astro bundles the
ordinary executable chart scripts.

## Ownership

- `src/components/charts/tanstack.ts`: synchronous lazy mounting, focus transfer,
  native DOM renderer, safe tooltip-body attachment and visible error handling.
  TanStack owns font-load recovery, keyboard/pointer focus, pinning, dismissal
  and responsive layout. Normal document navigation needs no router hook.
- `tanstack-options.ts`: definitions, domain descriptions, original-row tooltip
  content, result colors and the threshold annotation.
- `tanstack-style.ts` and `charts.css`: site colors, typography and tooltip styling.
- `tanstack-svg.ts`: paints the dark background only within the plot bounds,
  leaving axis gutters on the page background as before. It does not change
  margins, plot dimensions, scales or focus geometry. Dotted grid rules are
  restricted to the plot interior and snapped to half-pixels for crisp strokes.
- `data.ts`: renderer-neutral DTOs, imported **type-only** by the Astro wrappers
  and chart definitions. The ECharts modules, custom controllers, dependency and
  formatter-option tests are removed. Historical source remains at the accepted
  checkpoints; current coverage is mapped in `../baseline/README.md`.

## Preserved and tested

The same payloads, calculations, date ordering, shortened-season bounds and
original domain rows feed the plots. Unit tests render real TanStack scenes and
check explicit bounds, result-color assignment, zero-count seasons, original-row
identity, empty/one-point pace data, sparse responsive date ticks, and safe SVG
alternatives. Browser checks exercise the actual app at 1440px, 390px and 320px
in dev and preview: all four charts, real Tab entry and visible host outlines,
first/next values, Home/End, Enter/Escape, pointer hover, logo alternatives, the
SVG emoji, opaque colors/rules, interior grids, centered date labels, label
bounds, tooltip clearance, horizontal overflow and console errors.

Two integration details matter:

1. **Configured scale instances, not configured factories**, preserve explicit
   domains and color mappings. Factories deliberately infer domains. A factory
   that returned a configured scale could silently change the pace extent or
   reverse result colors depending on the first encountered row. Regression tests
   now enforce the intended geometry and colors.
2. The pace annotation is part of the SVG renderer output, not a DOM append in
   `onRender`. Focus redraws can replace SVG markup independently of that hook.
   The label and its accessible name therefore survive keyboard/pointer redraws.

The library's accessible surface and announcements replace the bespoke slider
controller, but domain descriptions and meaningful image alternatives remain
application responsibilities. Screen-reader review is still useful; passing DOM
checks is not a claim of complete accessibility certification.

## Review differences

The application and the differences below are accepted; this is **not a claim
of pixel-identical rendering**. In
particular, the pace curve currently uses D3 monotone-X rather than the ECharts
smoothing algorithm. Axes use TanStack's text/layout machinery, with matched
insets, colors and sparse ticks; typography and tick placement can differ.
The initial chart drawing is immediate rather than the previous entrance
animation. Native tooltips can be pinned with Enter/click and dismissed with
Escape. The real-layout review is complete; the old comparison implementation
has been removed without changing these accepted choices.

## Follow-up comparison with `chart-parity`

- Axis titles/ticks explicitly use full opacity instead of TanStack's 76%/68%
  defaults. Axis titles, ticks and the threshold annotation use bold (700)
  weight. Paints use global CSS variables directly, rather than a converted
  sRGB snapshot. Settled Chrome screenshot comparisons show unchanged geometry
  and at most one RGB channel step (out of 255) of color difference.
- Grids were already opaque; half-pixel alignment avoids softened one-pixel
  strokes. Grid lines at plot boundaries are omitted across all charts.
- Zero and surprise-threshold rules explicitly use full opacity instead of the
  library's 50% default. Intentional area/crosshair shading is unchanged.
- Season ticks use five-year labels without forcing 1993 onto the axis. Labels
  are centered; the right gutter increases from 8px to 16px so the final year
  remains readable even on narrow phones.
- The Team axis has neither tick marks nor tick labels; its title offset is
  40px rather than 20px, with enough bottom gutter to remain fully visible.
- The pace stroke is lime above the surprise threshold and bright red below,
  using a hard gradient stop at the exact crossing of the smoothed curve. Its
  gradient uses the line's bounds, independent of the area; flat/one-sided lines
  use solid colors. No games or interaction points are split or duplicated.
  The red token uses the same +24.1 OKLCH lightness lift as green-700 to lime-500,
  lime's chroma and the red fill's hue, rendered directly by SVG. The horizontal
  threshold remains lime. A native, datum-colored focus guide gives the active
  dot matching fill and outline: red below the threshold, lime at or above it.
  Pointer hover and keyboard navigation use the same marker; original game
  points are not duplicated.
- Pace dates use regular intervals: six at the 720px chart width, fewer on
  phones. Labels are centered, with no forced final-edge date overflowing the
  page. Every game remains in the plotted/interactive data.
- The lime focus outline belongs to the chart host, including when its SVG
  receives keyboard focus. Stats' descendant clipping no longer hides it.
- Shared tooltips use 28px anchor clearance and prefer above/below placement;
  lateral placement could clamp back over dots on phones. Native confinement,
  width limits and Stats clipping remain in place. Occasional clipped tooltip
  shadows near the host edge are intentional, rather than document overflow.

## Actual-app performance, not the simplified prototype

The initial integrated chart bundle was approximately **147 KB raw / 49 KB gzip**, versus
**595 KB raw / 199 KB gzip** for the former shared ECharts bundle—about **75% less
compressed chart JavaScript**. After the visual follow-ups and simplification it is **152,143 bytes
raw / 50,220 bytes gzip**, retaining that reduction; startup timings have not
been re-benchmarked. Data remains in the existing HTML payloads.

An initial integration measurement used Chrome 153, three cold browser contexts,
no CPU throttling, and the same Fast 4G parameters as the feasibility run. Both
built cases served the actual Stats page through the same gzip static helper:

| Case                                | Median first SVG + two frames | Completed `.js` body bytes |
| ----------------------------------- | ----------------------------: | -------------------------: |
| ECharts reference built Stats       |                       2,334ms |                    203,425 |
| TanStack integrated built Stats     |                       2,142ms |                     49,857 |
| TanStack integrated Astro dev Stats |                       5,483ms |                  2,630,485 |

The earlier ECharts Astro dev sample was about **14,111ms / 11,624,630 bytes**;
that dev comparison was not an interleaved benchmark. Unlike the simplified
prototype, the real app retains its font loading and page startup. The built-page
timing improvement here was **modest (~0.2s)** despite the much smaller JS payload.
Do not claim the prototype's ~0.4s appearance time for the actual application, or
claim that these local static measurements prove hosted performance. The metric
also does not represent completion of animations. Reports preserve the initial
integration sample; small final label/error-state adjustments followed it.

## Repeat the application checks

With the app running in dev or preview, and the baseline browser dependencies
installed:

```sh
mise x -- node plan/baseline/tanstack-application.mjs http://localhost:4321 /tmp/tanstack-app-review
```

This writes screenshots and `checks.json`. `tanstack-network.mjs` remains available
for throttled measurements. Main verification includes the new scene tests:

```sh
mise x -- pnpm run build
```

No deployment settings or production bindings were changed.

# TanStack application review

The actual Astro chart wrappers now mount **TanStack Charts 0.18.0**. Run the
normal `pnpm start` command on `tanstack-charts`, then review:

- `/stats/`: season bars, team results and scatter plot.
- `/2025/CHA/`: pace line, threshold fill and emoji.
- The same routes at mobile widths, with mouse and keyboard.

No separate prototype command or feature flag is required. There is no React
adapter or framework hydration. Inline JSON remains data; Astro bundles the
ordinary executable chart scripts.

## Ownership

- `src/components/charts/tanstack.ts`: lazy mounting, bounded font readiness,
  native DOM renderer, tooltip-body attachment and cleanup. TanStack owns keyboard
  interaction, pointer focus, pinning, dismissal and responsive layout.
- `tanstack-options.ts`: definitions, domain descriptions, original-row tooltip
  content, result colors and the threshold annotation.
- `tanstack-style.ts` and `charts.css`: site colors, typography and tooltip styling.
- `tanstack-svg.ts`: paints the dark background only within the plot bounds,
  leaving axis gutters on the page background as before. It does not change
  margins, plot dimensions, scales or focus geometry. Dotted grid rules are
  restricted to the plot interior and snapped to half-pixels for crisp strokes.
- The prior ECharts modules remain temporarily as a comparison/test reference.
  Their data interfaces are imported **type-only**. ECharts and its keyboard
  controller are not imported by the application chart scripts or present in
  the built client JavaScript. Remove the reference and move the shared DTOs
  once this review is accepted.

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

This is a working application port, **not a pixel-identical approval**. In
particular, the pace curve currently uses D3 monotone-X rather than the ECharts
smoothing algorithm. Axes use TanStack's text/layout machinery, with matched
insets, colors and sparse ticks; typography and tick placement can differ.
The initial chart drawing is immediate rather than the previous entrance
animation. Native tooltips can be pinned with Enter/click and dismissed with
Escape. Please review those changes in the real layout before deleting the old
comparison implementation.

## Follow-up comparison with `chart-parity`

- Axis titles/ticks explicitly use full opacity instead of TanStack's 76%/68%
  defaults. The theme resolves the same sRGB colors as the reference.
- Grids were already opaque; half-pixel alignment avoids softened one-pixel
  strokes. Grid lines at plot boundaries are omitted across all charts.
- Zero and surprise-threshold rules explicitly use full opacity instead of the
  library's 50% default. Intentional area/crosshair shading is unchanged.
- Season ticks use five-year labels without forcing 1993 onto the axis. Labels
  are centered; the right gutter increases from 8px to 16px so the final year
  remains readable even on narrow phones.
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
compressed chart JavaScript**. After the visual follow-ups it is **148,197 bytes
raw / 49,330 bytes gzip**, retaining that reduction; startup timings have not
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

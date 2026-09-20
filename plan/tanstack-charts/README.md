# TanStack Charts feasibility checkpoint

**Branch:** `tanstack-charts`, based on `7df53c8`.
**Decision:** promising enough to proceed; no fundamental vanilla-JS or chart-family blocker found.
**Status:** isolated prototype, **not an application replacement or visual-parity approval**.
The site's ECharts implementation and dependencies are unchanged.

## Version and isolation

The prototype pins `@tanstack/charts` to **`0.18.0`**, not a caret range. Its
registry publication was 2026-09-10, outside our three-day package cooldown.
It uses the supported DOM renderer host, not React or another framework adapter.
The independent lockfile/install passed `pnpm audit` with no known findings.
Optional framework peers were not installed. D3 shape 3.2.0 is explicitly pinned
for the curve experiment; compact linear, band, point and ordinal scales come
from TanStack's exact subpaths, not the D3 umbrella.

Templates are materialized into an independent temporary project with its own
node_modules. The `.template` suffix keeps experimental TypeScript/dependencies
out of the main Astro type-check graph. No shared dependency directory, application
configuration changes, or production deployment is needed.

## What actually worked

Real payloads extracted from the current built site:

| Chart           | Data             | Prototype result                                                                |
| --------------- | ---------------- | ------------------------------------------------------------------------------- |
| Surprise counts | 29 seasons       | Categorical bars, typed rich tooltip with team-logo images and alt text         |
| Team results    | 30 teams         | Positive/negative bars, zero rule, grouped tooltip, one keyboard step per team  |
| Scatter         | 269 team-seasons | Numeric scales, result colors, original rows in focus callbacks                 |
| Pace            | 82 CHA games     | Smooth line, area to a fixed threshold, hard green/red gradient, threshold rule |

Browser checks cover native focus, arrow navigation, Home/End, custom-tooltip
pinning/dismissal, original-row identity, image loading/alternatives, resize to
390px without horizontal overflow, and no page errors. There is **no application
keyboard controller** in this prototype. The team navigation sequence visits all
30 teams once and clamps at the last team.

The full renderer host's `onTooltipBodyChange` allows native DOM composition;
React is not necessary for image-rich tooltips. Use `createSvgChartRenderer` with
the concrete row/axis types: the exported unknown-typed renderer constant is not
assignable to these strictly typed hosts in this version. `dot.fill` is a literal
paint, so per-row result colors use the color channel plus an explicit ordinal
scale. These are verified 0.18.0 API details, not assumptions from marketing copy.

## Still required before replacing ECharts

- Exact fonts, text outlines, margins, ticks, grid dashes, labels, plot colors,
  hover outlines and tooltip layout; the prototype deliberately uses basic styling.
- ECharts' smoothing is **not proven equivalent** to D3 monotone-X. TanStack
  accepts custom line/area path generators, so preserving the existing curve is
  possible in principle, but needs geometry and screenshot comparisons.
- Confirm gradient threshold placement for every season, including shortened,
  empty and one-point series, and out-of-domain projected values.
- Restore the visible pace threshold emoji with its accessible alternative.
- Preserve chronological season keyboard order without changing its approved
  visual order; the prototype currently follows the payload's descending order.
- Verify scatter ties/order, pointer-to-keyboard ownership, Escape behavior,
  focus retention, clipping, tooltip collisions and complete screen-reader text.
- Keep our domain descriptions, image alternatives, reduced-motion coverage and
  font-failure behavior. Library keyboard support does not replace those contracts.
- Compare all approved desktop/mobile screenshots and chart data, then measure
  the actual replacement inside Astro under the same cache/network conditions.
- Only then remove ECharts and redundant keyboard/tooltip plumbing. Keep the
  existing implementation as the comparison reference until that point.

## Measurements, with limits

Chrome **153.0.8010.48**, cold browser contexts/cache disabled, no CPU throttling,
three runs per case. Fast 4G parameters follow current Chrome DevTools:
**165ms emulated latency, 1,012,500 bytes/s download, 168,750 bytes/s upload**.
These incorporate DevTools' adjustment factors for its nominal 9 Mbps / 60ms
profile. The metric is first chart SVG insertion plus two animation frames,
**not** completion of animation or a screen-reader readiness measurement.

| Case                                          | Median first-SVG opportunity | Captured `.js` response bodies |
| --------------------------------------------- | ---------------------------: | -----------------------------: |
| Existing Astro/ECharts dev Stats page         |                     14,111ms |               11,624,630 bytes |
| Simplified TanStack/Vite dev prototype        |                      2,671ms |                2,011,386 bytes |
| Existing built Stats page, gzip static server |                      2,351ms |                  202,842 bytes |
| Built TanStack prototype, gzip static server  |                        432ms |                   45,066 bytes |

**These page timings are diagnostic, not an exact-parity speedup claim.** The
prototype lacks the site's font loading, chrome and matched animation/styling.
The dev host also differs (plain Vite versus Astro). `.js` accounting excludes
`.ts` entry URLs and extensionless HMR URLs. Server caches were not reset between
runs. Hosted compression/CDN/Worker behavior is not being measured.

The built prototype separates its data into inline JSON, as the app does. Its
four-chart JavaScript is **133,438 raw / 45,066 gzip bytes** (gzip level 9).
The current **shared ECharts bundle alone** is **594,874 raw / 198,698 gzip bytes**,
excluding the application's small per-chart chunks. That is about **77% less
compressed JS** for this prototype, not a promise for the finished port. The
runtime entry, features, data and lockfile are preserved here for review.

### The long dev request and `parseGeoJSON`

ECharts exports `parseGeoJSON` from `echarts/lib/export/api.js`, backed by
`echarts/lib/coord/geo/parseGeoJson.js`. Its presence does not mean the tracker
uses maps. Broad development dependency entries retain more code than the
production tree-shaken bundle.

The captured optimizer used names such as `Axis-SZibq2Xv.js`, rather than the
user's exact `parseGeoJSON` request. Its 2,667,332-byte response took about 9.4s:
roughly 6ms from request to first byte, and 8.95s downloading while other large
chunks competed for bandwidth. The on-disk optimized file was only 677,809 bytes;
Vite's served response appended **1,989,454 bytes of inline source map**. The
charts and components entries were another 2.58MB and 2.45MB served respectively.
This reproduces the long **network** delay, not a ten-second geo-parser execution.
Narrower ECharts dev imports could also be investigated independently; switching
libraries is not the only possible remedy for development transfer overhead.

### Astro script semantics

The existing `is:inline` scripts are `type="application/json"` data payloads.
The actual chart code lives in ordinary `<script>` tags, which Astro bundles and
executes in the browser. This is correct for a vanilla-JS DOM host. `client:*`
hydrates framework components; converting these Astro wrappers to React islands
would add a framework unnecessarily. No script-directive fix is needed.

## Reproduce

Build the reference application first. From the repository root:

```sh
mise x -- pnpm run build
SPIKE=$(mise x -- node plan/tanstack-charts/prepare.mjs)
mise x -- pnpm --dir "$SPIKE" install --frozen-lockfile
mise x -- pnpm --dir "$SPIKE" exec tsc
mise x -- pnpm --dir "$SPIKE" run build
mise x -- pnpm --dir "$SPIKE" exec vite --host 127.0.0.1 --port 4351
```

The last command stays in the foreground. In another terminal, with the
standalone baseline browser dependencies installed:

```sh
mise x -- node plan/baseline/tanstack-feasibility.mjs http://localhost:4351 /tmp/tanstack-browser.json
mise x -- node plan/baseline/tanstack-network.mjs tanstack-dev http://localhost:4351 '#season svg' /tmp/tanstack-dev-network.json
```

For controlled gzip built-page measurements, serve the reference `dist/client`
and the prototype's `$SPIKE/dist` in separate terminals:

```sh
mise x -- node plan/baseline/serve-static-gzip.mjs dist/client 4350
mise x -- node plan/baseline/serve-static-gzip.mjs "$SPIKE/dist" 4349
```

Then run the network harness against `http://localhost:4350/stats/` with selector
`[data-chart="surprises-per-season"] svg`, and against `http://localhost:4349/`
with selector `#season svg`. Stop all foreground servers with Ctrl+C afterward.
The measurement helper serves static files only, not Worker endpoints. Results
under `results/` record the initial experiment; regenerate rather than treating
those numbers as promises after code, data, browser or tool changes.

## Sources

- [Vanilla DOM quick start](https://tanstack.com/charts/latest/docs/quick-start)
- [Accessibility](https://tanstack.com/charts/latest/docs/guides/accessibility)
- [Tooltips and focus](https://tanstack.com/charts/latest/docs/guides/tooltips-and-focus)
- [Bundle size and performance](https://tanstack.com/charts/latest/docs/guides/bundle-size-and-performance)
- [Source](https://github.com/TanStack/charts), reviewed at `327f488`; runtime
  behavior/type checks use the actual published **0.18.0** package.
- [DevTools network presets](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts)

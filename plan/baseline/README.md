# Application regression and historical baselines

## Setup

```sh
cd plan/baseline && pnpm install --frozen-lockfile
```

Browser scripts use Playwright with system Google Chrome (`channel: "chrome"`).
This module keeps its dependencies separate from the application.

## Current chart validation

Run against both an Astro dev server and a built preview, using the actual app:

```sh
mise x -- node plan/baseline/tanstack-application.mjs http://localhost:4321 /tmp/chart-review
mise x -- node plan/baseline/tanstack-tooltip-safety.mjs http://localhost:4321
mise x -- node plan/baseline/tanstack-resilience.mjs http://localhost:4321
```

- **`tanstack-application.mjs`**: four charts at 1440/390/320px; plot-only
  backgrounds, opaque/bold labels, interior grids, label bounds, real Tab entry,
  Home/End and arrow navigation, Enter/Escape, pointer handoff, original tooltip
  rows, threshold-colored line/dot, tooltip clearance, image alternatives,
  resize persistence, live CSS token changes, no document overflow or browser errors. Writes screenshots
  and `checks.json`.
- **`tanstack-tooltip-safety.mjs`**: intercepts only the test browser's HTML
  response to inject isolated season/team/history/scatter fixtures. Actual app
  tooltips must preserve literal names and quoted image URLs, provide meaningful
  alternatives and never create injected elements or event attributes. No
  authoring data is changed. Complements the new builder unit tests in place
  of the old ECharts formatter-string tests.
- **`tanstack-resilience.mjs`**: blocked/stalled WOFF requests must not leave any
  chart blank or prevent keyboard navigation. Delayed successful requests are
  released only after charts render and navigate; the harness then checks native
  remeasurement, loaded regular/bold faces, focus preservation and resizing.
  It also verifies no application calls to `document.fonts.load`. Held routes
  and browsers are released.
- **Unit tests**: `tests/tanstack-charts.test.ts` checks real scenes, data identity,
  ordering, bounds, colors, zero/empty/shortened seasons, grid geometry, date ticks
  and focus marker states. `chart-descriptions.test.ts` checks meaningful textual
  descriptions; `chart-tooltip.test.ts` keeps all four logo/text construction
  paths in the unit gate and rejects HTML parsing. `chart-theme.test.ts` checks
  direct CSS-variable paints; the old font-wait helper/timer tests are removed.
  These run through Vitest, verify/build and hooks.

The browser scripts are manual checks, not part of Vitest/hooks/CI. CI adoption
needs explicit server/browser setup and teardown. DOM checks do not replace a
full screen-reader review. Stop test servers after use.

## Generic capture and measurement tools

- `capture.mjs` / `compare.mjs`: page screenshots, response inventories and
  reference comparisons. See [usage notes](legacy-notes.md).
- `tanstack-network.mjs`: actual page network/timing capture. Read
  [the application review](../tanstack-charts/application-review.md) for methodology
  and limits: first SVG plus two frames is not animation completion or complete
  accessibility readiness; prototype measurements are not actual-app timings.
- `serve-static-gzip.mjs`: local gzip server for controlled built-static comparisons.
  This does not measure hosted Worker/CDN behavior.
- `sqlite-application.mjs`: cross-build route text, payload and screenshot evidence.
  Dataset/score/provider-ID invariants are also covered by current Vitest tests.

## Retired ECharts checks and historical experiments

ECharts, its custom keyboard/tooltip controllers and formatter-option tests were
removed after the TanStack application was approved. The old slider/internal-SVG
browser checks are also retired, rather than being presented as current checks.
See [legacy-notes.md](legacy-notes.md) for the old commands and recovery checkpoints.
Existing `runs/` and TanStack feasibility/application results are preserved.

`chart-performance.mjs` (and its summary), `check-sqlite-pilot.mjs`,
`check-render-probe.mjs`, `prepare-render-probe.mjs`, frontmatter profiling,
legacy React capture and optimizer probes remain **historical experiments**.
Their renderer-specific selectors, preparation inputs and directory assumptions
require the corresponding historical checkout; they do not validate today's app.
The standalone feasibility package remains separate and exactly pinned.

Cleanup coverage mapping: option/domain/ordering assertions → current scene tests;
spoken descriptions → description tests; escaped logo HTML → actual tooltip DOM
fixtures; keyboard/image/layout checks → application browser harness; blocked and
stalled and delayed successful fonts → native-recovery browser checks. Historical pixel evidence
and corrected data assertions are retained, not regenerated or discarded.

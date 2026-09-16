# Baseline / regression capture

Throwaway-but-reusable tooling for the 2026 new-season sweep. Captures what a
deployed (or locally served) build of the site actually ships, so each round of
changes can be compared against a known-good reference.

## Setup

```sh
cd plan/baseline && pnpm install
```

Uses the system Google Chrome via Playwright's `channel: "chrome"`. Override with
`--chrome /path/to/binary` or `CHROME_PATH`.

## How the checks fit together

- **Unit tests:** `tests/chart-options.test.ts` runs with `pnpm test`
  (Vitest), normal verify/build and the existing test hook. It checks chart
  options, navigation order and spoken descriptions without content collections.
  System validation now reads fresh JSON through `tests/content-fixture.ts`, not
  Astro's dev store; see `tests/README.md` for the full unit/tooling test inventory.
- **Browser regressions:** `chart-parity.mjs`, `stats-parity.mjs`,
  `stats-tooltips.mjs` and `stats-keyboard.mjs` are reusable Playwright scripts
  in this standalone module. Run them against a running **dev server and built
  preview** after chart/shared-interaction changes. Each accepts `--base` and
  optional `--out`; assertion failures exit nonzero. They are **not** currently
  included in `pnpm test`, pre-commit or CI. CI wiring would need server/browser
  setup and teardown, not merely adding them to Vitest.
- **Data corrections:** `data-corrections.mjs --base http://localhost:4322`
  checks D1/D3 in actual rendered team tables, chart data, tooltips and keyboard
  descriptions. Run against dev and built preview; failures exit nonzero. This
  manual script accepts `--base` only and is not in CI. The companion
  `tests/content-utils.test.ts` runs automatically with Vitest using fresh JSON.
- **Chart resilience:** `chart-resilience.mjs --base http://localhost:4322`
  blocks/stalls fonts across all four charts and checks mouse/keyboard/touch
  handoff, one active scatter outline and Escape/popover precedence. Like the
  data-correction probe, it accepts `--base` only and is manually run against
  dev and preview. Font readiness also has ordinary Vitest coverage.
- **Captures:** screenshot/response inventories and production comparisons
  complement those checks, but do not prove keyboard or interaction behavior.

## Chart performance baseline

`chart-performance.mjs` measures the two chart pages against a running server:

```sh
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4322 --dist /path/to/baseline/dist --revision REVISION --out /tmp/new-chart-capture
```

Five fresh-context/reload pairs per page by default. Records navigation/resource
and font-call timings, chart-ready frame proxies, browser errors, screenshots
and raw/gzip/Brotli build sizes. No CPU/network throttling or production code
instrumentation. `--paths /stats/`, `--runs 1`, and `--reduced-motion reduce` allow
focused probes. The revision is an operator-supplied label. Use a new output
directory; raw captures can be large. `chart-performance-summary.mjs INPUT.json
NEW-SUMMARY.json` regenerates compact summaries without starting a browser.

See [the ECharts baseline review](../new-season-sweep/prelaunch-review/chart-performance-baseline.md)
for actual results, exact conditions, running URLs and manual reproduction.
Capture cold-server first visits separately from warm-server/cold-browser visits;
keep Sentry, content, hardware and browser settings comparable between libraries.
These scripts are manual research tools, not CI tests or accessibility checks.

## Server profiling / deferred-render research

`prepare-render-probe.mjs EXTERNAL_COPY` installs diagnostic instrumentation and
an archived-fixture server island into a **separate git archive of e2a8b30**.
It refuses the working source tree and repeat preparation. `check-render-probe.mjs`
compares the built island's chart payload with the frozen archived page and checks
mounting, keyboard End selection and fresh `no-store` requests on navigation/reload.
Defaults are baseline port 4322 and probe port 4324; optional positional arguments
override those two base URLs.

`probe-import-cache.mjs EXTERNAL_COPY enable|restore` is a reversible dependency
counterfactual, **not a production/HMR fix**. It requires local dependency files,
not external symlinks. Never deploy these diagnostic routes or the experiment.

See [server profiling and island review](../new-season-sweep/prelaunch-review/render-profile-and-island.md)
for the source-level cause, A/B/A results, request/render distinctions and exact
reproduction instructions. The performance summarizer includes island resource
timings separately from document/chart readiness. These remain manual tools.

## Capture

```sh
node plan/baseline/capture.mjs --base https://nbastt.grepco.net --label prod
node plan/baseline/capture.mjs --base http://localhost:8788 --label main-local
```

Writes `plan/baseline/runs/<YYYY-MM-DD>-<label>/`:

- `summary.json` / `summary.md` — per page: status, redirect chain, HTML bytes,
  script + stylesheet inventory, JS/CSS bytes shipped, server-island endpoints
  and their response headers, console errors, navigation timing
- `html/<page>.html` — served HTML as fetched (no browser)
- `screens/<page>-<viewport>.png` — full-page screenshots per viewport

Flags: `--pages /,/about` (override page list), `--no-screenshots`,
`--third-party` (let the browser load cross-origin resources; off by default so
screenshots are deterministic), `--out <dir>`.

## Compare

```sh
node plan/baseline/compare.mjs --a plan/baseline/runs/2026-09-07-main-local --b plan/baseline/runs/2026-09-08-tailwind-local
```

Prints size deltas per page and pixel-diff percentages per screenshot; writes
diff images to `<b>/diff/`.

## Local reference build

The comparison target for foundation work (group 1) is committed `main` plus the
2025 archive, built and served the way Pages serves it. Recipe (throwaway dir):

```sh
mkdir -p /tmp/main-baseline && git archive main | tar -x -C /tmp/main-baseline
cp src/content/games.json /tmp/main-baseline/src/content/games.json
cd /tmp/main-baseline && pnpm install --frozen-lockfile && pnpm exec astro build
pnpm exec wrangler pages dev dist --port 8788 --compatibility-date 2025-03-21 --compatibility-flags nodejs_compat --kv GAMES_KV
```

Then `node plan/baseline/capture.mjs --base http://localhost:8788 --label <name>`.

`wrangler pages dev` dies partway through a full capture (`Error inside
ProxyWorker` / `Network connection lost`, wrangler 4.129, three runs out of
three on 2026-09-09). When that happens, serve the build with
`node plan/baseline/serve-dist.mjs <dist> <port>` instead: it returns
`<path>/index.html` for `/path/`, 308s `/path` to `/path/` and serves
`404.html` with a 404, which is what Cloudflare does for a prerendered site.
Capture both sides through the same server so the comparison stays honest.

## dev-smoke.mjs

`capture.mjs` only ever sees built output, so it says nothing about
`astro dev`. Since adapter 14 the two environments differ enough that a config
can build perfectly and serve nothing in dev, which is how a round shipped with
every image broken under `pnpm start`. Start the dev server, then run
`node plan/baseline/dev-smoke.mjs --base http://localhost:4321`. It loads seven
pages in a real browser, scrolls each one so lazy images request, and exits
non-zero on an image that never decoded, a console error, a failed request, or
any response at 400 or above. Run it in any round that touches dev, the
adapter, or images.

## chart-parity.mjs

```sh
node plan/baseline/chart-parity.mjs --base http://localhost:4322 --out /tmp/chart-parity
```

Run against **dev and workerd preview** after changing pace charts, keyboard
controls or shared table styles. Checks three team seasons (including a
shortened season) at desktop/mobile widths: visible plot/table top alignment,
alternating rows, 0.8 area opacity, vertical grid lines, only one horizontal
threshold line, endpoint/threshold labels only, and SVG threshold-image responses. Exercises
Tab discovery before scrolling a lazy chart into view, mobile table-trigger
order before the chart, desktop chart-first order, arrow/Home/End selection,
boundary clamping, Escape/blur dismissal, forward/backward Tab escape and mouse
hover afterward. Cross-breakpoint checks preserve chart focus/selection and open
table popovers; mobile sessions also exercise the fallback without `moveBefore`.
An already-rendered chart is resized through 1280/1279/1150/1030/1024/1023px:
asserts production's 3:2 column widths, single-line records and no overflow. `--out` optionally saves keyboard screenshots and JSON results.
Failures exit nonzero. These are the agreed **new** chart choices, so this probe
is not expected to pass against unchanged production.

`tests/chart-options.test.ts` also tests tick choices (82/66/50 games), the option
contract and spoken point descriptions without requiring content collections.
This focused probe does not yet cover the stats-page charts or replace a
screen-reader/browser compatibility review.

## stats-parity.mjs

```sh
node plan/baseline/stats-parity.mjs --base http://localhost:4322 --out /tmp/stats-parity
```

Run on dev and workerd preview. Mounts all three Stats charts before narrowing
from 1920 through desktop/stacked/mobile breakpoints and back. Checks equal
columns, section/chart/table containment, season-plot/top-10 alignment, removal
of the dotted frame, one bar per actual season, edge spacing and endpoint
tooltip text. Captures may retain a tooltip: dismissal/revalidation and keyboard
access remain separate audits, as do the lower charts' scales and styling.

## stats-tooltips.mjs

```sh
node plan/baseline/stats-tooltips.mjs --base http://localhost:4322 --out /tmp/stats-tooltips
```

Checks all three Stats charts at 1440/390: 8px mobile margins, no boundary grid
lines or gray axis overlays, dotted scatter zero, and 20 real within-point
mousemoves per chart. Heading/icon nodes must remain identical, visible and
decoded, with zero image requests during movement. Also verifies the scatter's
hover outline surrounds the mouse target. Run on dev and preview;
use the other probes for changed-point contents, resizing and pace keyboard
behavior. This is not a general dismissal or screen-reader audit.

## stats-keyboard.mjs

```sh
node plan/baseline/stats-keyboard.mjs --base http://localhost:4322 --out /tmp/stats-keyboard
```

Checks all three Stats charts at desktop/mobile: Tab discovery before scrolling,
responsive Top 10/season-chart reading order, focus rings, arrows/Home/End,
endpoint clamping, spoken-value/tooltip mapping, Escape, Tab escape and focus
preservation across breakpoints. Scatter checks also verify exactly one outlined
point at the selected data coordinates, including the effective 2px stroke after
SVG scaling. Mobile tests exercise the DOM-move fallback.
Screen-reader operation remains a manual check. Run alongside Stats layout and
tooltip probes and the pace regression probe after shared keyboard changes.

Known, expected deltas vs prod:

- Prod pages carry ~150 KB more JS: the Sentry client SDK, bundled only when
  `SENTRY_AUTH_TOKEN` is present at build time. Local builds never include it.
- Prod injects Cloudflare scripts (Web Analytics beacon everywhere, email
  obfuscation decoder on `/about`, bot-challenge loader). Local has none.
- Server-island `Cache-Control` only appears while a season has upcoming games.
  Out of season the action returns no `expiresAt`, so no header is set.

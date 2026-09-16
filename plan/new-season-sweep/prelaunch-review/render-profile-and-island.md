# Review stop 2: server profiling and a built server-island probe

**Conclusion:** the large dev delay is primarily the interaction between many
repeated Astro content lookups and the current Vite development module runner.
It is not primarily ECharts downloading or drawing. The same full-season team UI
renders quickly through a **built, uncached server island** in local preview.
That narrows the live-season risk substantially; it does not validate NBA/KV,
hosted cold starts, Sentry delivery or slow-device/network performance.

Application base remains `e2a8b30`. All instrumentation, fixture routes and the
reversible dependency experiment live in a separate disposable copy. Nothing
under the working repository's `src/`, configuration or dependencies changed.
The earlier frozen baseline servers are untouched.

## 1. What costs time in dev

Stats performs **2,172 `getEntry("seasons", …)` calls and 352 team lookups** per
render. Its warm instrumented render spends approximately a second in aggregate
awaited content-entry calls. Archive filtering/calculations and other rendering
work account for additional time; the import experiment below does not eliminate
all of it.

The team UI performs **257 season-entry lookups** for the complete 82-game
fixture. Its per-game loop calls both `pace()` and `projectedWins()`;
`pace()` itself calls `projectedWins()` and `winsToSurprise()`. Those helpers
repeatedly retrieve rules for the same season. There are also summary lookups.
This is existing application redundancy, independent of the chart library.

For the full team detail page, we additionally observed 538 team and 538 season
lookups outside the middleware trace in steady-state serial dev requests.
The route's `getStaticPaths()` enumerates the 269 team seasons and retrieves
both entries. These out-of-trace counts cover the interval between traced
requests; they are not a precise CPU attribution to one request. They point to
additional dev route/path preparation, not the server-island UI itself.

### Why these small lookups add up

In installed Astro **7.3.1**, `dist/content/runtime.js` dynamically imports
`astro:asset-imports` inside each `getEntry()` and `getCollection()` call, even
for these JSON-only collections. In Vite **8.2.2**, the module runner's
`cachedModule()` / `getModuleInformation()` checks module information through
`transport.invoke("fetchModule", …)` even when evaluated exports are cached;
only concurrent requests share the in-flight module-information promise.

These are local development module-freshness checks—not thousands of NBA
requests, database queries or ECharts downloads. Native imports in the built
Worker do not use this dev runner.

### Controlled A → B → A experiment

In the disposable copy **only**, temporarily cached the asset-import promise
inside Astro's two content lookup functions. No application calculations or
chart code changed. Restarted dev/cleared that copy's optimizer cache between
conditions. Each page had one warm-up request and three recorded repeat requests:

| Median HTML first byte | Original A | Cached-import B | Restored original A2 |
| ---------------------- | ---------: | --------------: | -------------------: |
| Stats                  |   1,474 ms |          395 ms |             1,546 ms |
| Team detail            |     672 ms |           34 ms |               659 ms |

The response chart-data hashes were identical throughout. Restoring the original
runtime restored the delay. The restored file's SHA-1 matches the untouched
working dependency file: `5de18556061cea7ea4d243f3b363f9ed08c567ac`.

**B is not a proposed fix.** Keeping that promise across HMR can retain stale
asset mappings. The experiment establishes the importance of that import/dev
module path; it is not an endorsement of patching dependencies. Its effect also
includes dev caching/path-preparation behavior, not merely one isolated CPU
operation. A safe application cleanup would load season metadata once and use
pure calculations, or a framework fix would need proper invalidation tests.
Neither is implemented here.

## 2. Built server-island results

The diagnostic `/render-probe/` page defers `ProbeTeamStats` with `server:defer`.
The island renders the **existing team-stats UI** with a generated 2025 archive
fixture: 639 candidate-season games, including Charlotte's 82 games. It uses
real Astro metadata lookups, real calculations, existing chart data generation,
and unchanged browser ECharts/keyboard code.

It does **not** call the live action, NBA feed or KV. It does not use
`getSeasonArchive()` on each island request; that would add archive retrieval
work not representative of a live KV response. The fixture isolates rendering
once game data is available. The live action's historical-season rejection is
unchanged.

Five fresh browser contexts, each followed by a reload in the same context.
**Every island response is `Cache-Control: no-store`**; warm means browser asset
cache and a reused local runtime, not a cached island response.

| Environment / browser cache | Median island request duration | Median first chart-ready frame from navigation |
| --------------------------- | -----------------------------: | ---------------------------------------------: |
| Dev / cold                  |                         185 ms |                                         352 ms |
| Dev / warm reload           |                         184 ms |                                         290 ms |
| Built preview / cold        |                         9.0 ms |                                         118 ms |
| Built preview / warm reload |                         9.4 ms |                                          64 ms |

Cold/first-visit details are retained, not hidden in the medians:

- First built island request: **46.5 ms**; later requests **8.2–12.9 ms**.
- First built navigation: **133 ms to HTML, 290 ms to the chart-ready frame**.
  This is the first local request after starting preview, not a Cloudflare
  cold-isolate SLA or an isolated CPU measurement.
- First instrumented island render: **36 ms**, including **27 ms** in its first
  metadata lookup/content-store initialization. Later instrumented renders
  were a few milliseconds. The 257 season lookups remained present, but were
  inexpensive in the built runtime.
- Normal animation still continues for roughly another second after readiness.

The browser requests the ECharts chunk **after the island response/insertion**
in these captures. So its size can still affect first-visit live-season loading
on slower networks/devices. What the evidence rules against is blaming that
browser download for the measured 1.5-second dev HTML wait.

### Functional checks

On both a first navigation and a reload:

- The island returns 200 with `no-store`; a new island request occurs each time.
- The loading fallback disappears and the chart mounts.
- Its complete JSON chart payload equals the frozen built archived team page's.
- Focus + End selects the last point, with matching max value and spoken text.
- No browser errors in the capture/check runs.

This is not a full visual, screen-reader, touch or cross-browser review.

## 3. Blast radius / recommendation

- **Deployed Stats and archived pages:** these calculations run at build time.
- **Dev:** repeated content lookups amplify module-runner overhead; dynamic team
  route preparation adds further work. Changing only the browser chart engine
  would not remove these lookups.
- **Live server island:** the shared UI work does run on demand. The built probe
  exercises it with a complete season and does not reproduce the dev delay.
- **Still unmeasured:** actual KV/network latency, upstream refreshes/failures,
  validation, CDN/KV behavior, hosted CPU/startup limits and slower devices.
  The existing server middleware was preserved with DSN unset; browser Sentry
  integration was not enabled, matching the earlier baseline.

My take: this is **not evidence of an inherent two-second production rendering
regression**. Chart.js remains worth evaluating for browser payload and
maintainability, but is not an emergency fix for this dev delay. Keep any content
lookup cleanup separate so its gains do not get attributed to a chart migration.

## 4. Manual reproduction — current servers

The diagnostic copy is recorded in `/tmp/nbastt-render-probe-path.txt`.
Its original dependency runtime has been restored; the cached-import experiment
is **not** active.

- Dev island: http://127.0.0.1:4323/render-probe/
- Built island: http://127.0.0.1:4324/render-probe/
- Original frozen static team reference: http://127.0.0.1:4322/2025/CHA/
- Original frozen Stats dev reference: http://127.0.0.1:4321/stats/

1. Open Network with no throttling. Enable **Disable cache**, reload the probe.
2. Inspect the document, then `/_server-islands/ProbeTeamStats/`. Inspect its
   Timing, `Cache-Control: no-store`, and diagnostic `Server-Timing` header.
3. Find the ECharts script request after the island. Watch the fallback become
   the real table/chart. Focus the chart and try Home/End/arrow keys.
4. Turn **Disable cache off** and reload. The scripts/fonts can be cached; the
   island should still make a fresh request. Compare dev versus built preview.
5. Optionally emulate reduced motion to separate animation from readiness.

Repeat the automated capture from the working repository (use new directories):

```sh
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4323 --paths /render-probe/ --revision e2a8b30-diagnostic --out /tmp/island-dev-review
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4324 --paths /render-probe/ --revision e2a8b30-diagnostic --out /tmp/island-preview-review
mise x -- node plan/baseline/check-render-probe.mjs
```

The summary now includes separate server-island resource timings. Full resource
waterfalls and screenshots remain in each capture directory. Read the same
hardware/cache/readiness-proxy limitations as the preceding baseline report.

## 5. Reconstruct the diagnostic independently

Do **not** target the existing baseline copy or the working source tree.
Create a fresh directory, export `git archive e2a8b30` into it, trust its reviewed
mise config, install locked tools and local frozen dependencies. Do not copy
`.env` files. Then, from the working repository:

```sh
mise x -- node plan/baseline/prepare-render-probe.mjs "$PROBE"
```

The preparer refuses the main source tree and a second application to the same
copy. It writes research-only routes/helpers, wraps content calls, adds phase
markers, and wraps the existing middleware. With Sentry-related environment
variables unset, run through mise in the diagnostic copy:

```sh
pnpm exec wrangler types
pnpm exec astro check
pnpm exec astro dev --host 127.0.0.1 --port 4323
# Separate build/preview step, not while collecting dev measurements:
pnpm exec astro build
pnpm exec astro preview --host 127.0.0.1 --port 4324
```

Serial curl requests to `/stats/` and `/2025/CHA/` on port 4323 print one
`[render-profile]` JSON record in the dev terminal. For external wall time:

```sh
curl -sS -o /dev/null -w 'first byte %{time_starttransfer}s; total %{time_total}s\n' http://127.0.0.1:4323/stats/
```

The middleware buffers the response **in this diagnostic copy only**, so its
profile covers the complete streamed render. Counters are aggregate awaited
wall-time measurements with coarse runtime clocks, not exclusive CPU timings.
They must not be summed indiscriminately. External curl/browser timings and the
A/B/A result are the stronger evidence. Out-of-trace counters assume serial
requests; they cannot precisely assign work across concurrent requests.

For the optional counterfactual, stop diagnostic dev first:

```sh
mise x -- node plan/baseline/probe-import-cache.mjs "$PROBE" enable
# Clear only "$PROBE/node_modules/.vite", restart dev, warm up, measure.
# Then stop dev again and restore:
mise x -- node plan/baseline/probe-import-cache.mjs "$PROBE" restore
# Clear that copy's optimizer cache, restart, warm up, measure again.
```

This tool refuses dependencies symlinked outside the diagnostic copy, backs up
the original runtime exclusively, and provides restoration. Never deploy the
instrumented copy, fixture routes or cached-import experiment.

## Evidence / review gate

Compact captures and serial A/B/A observations are under
`plan/baseline/runs/render-probe-e2a8b30/`. Raw captures are in
`/tmp/nbastt-render-probe-dev-capture/` and
`/tmp/nbastt-render-probe-preview-final/`. Server logs/profiles are under
`/tmp/nbastt-render-probe-*.log`; current diagnostic PIDs are recorded in
`/tmp/nbastt-render-probe-pids.json`.

Diagnostic builds/typechecking and the browser payload/keyboard/cache checks
pass. No production fixes, dependency changes, push or deployment. User-owned
`.gitignore` and `scr.js` remain untouched.

**Stop for manual review here.** The next planned experiment is the Chart.js
pace-chart spike, only after this evidence and the deferred behavior are reviewed.

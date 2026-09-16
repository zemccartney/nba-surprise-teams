# Review stop 1: unchanged ECharts baseline

**Application revision:** `e2a8b3026b99c233c47aeee4f159086c766c1a24`.
No application/configuration changes, Chart.js dependency, server-island probe,
push or deployment. This checkpoint adds measurement tooling and results only.

## Findings

The reported slow dev load is reproducible, but **most of the delay is waiting
for the HTML response, not downloading or drawing ECharts**. Stats takes about
1.5 seconds to its first byte on repeat dev requests. A plain curl request,
which executes no browser JavaScript, reproduces that delay. Built preview
serves its prerendered HTML in a few milliseconds.

Five fresh browser contexts per page/environment, each followed by a reload in
that same context. Times below are medians, in milliseconds from navigation:

| Environment   | Page  | Browser cache | HTML first byte | First chart-ready frame |
| ------------- | ----- | ------------- | --------------: | ----------------------: |
| Dev           | Stats | Cold          |           1,531 |                   1,665 |
| Dev           | Stats | Warm reload   |           1,481 |                   1,545 |
| Dev           | Team  | Cold          |             704 |                     834 |
| Dev           | Team  | Warm reload   |             685 |                     756 |
| Built preview | Stats | Cold          |               3 |                     115 |
| Built preview | Stats | Warm reload   |               5 |                      45 |
| Built preview | Team  | Cold          |               3 |                     114 |
| Built preview | Team  | Warm reload   |               5 |                      44 |

The first visit after starting a fresh dev process/optimizer cache was slower:
Stats **1,703 ms first byte / 1,832 ms chart frame**; team **835 / 986 ms**.
These first visits are retained in the five-run distributions, not discarded.
Server startup time before Astro reports ready is not part of navigation timing.

Additional observations:

- Explicit chart font-load calls took roughly **27–38 ms cold** and **0–6 ms
  warm**. None hit the 1,500 ms fallback in the valid captures.
- Readiness is not animation completion. Normal-motion preview charts continued
  changing their DOM until roughly **1.1 seconds after navigation**. A separate
  one-pair-per-page reduced-motion probe brought that down to roughly **0.1
  seconds**. This is an animation observation, not a load-time improvement from
  changing libraries.
- The initial viewport has one mounted chart. The harness then scrolls through
  and checks readiness of all three Stats charts/the team pace chart.
- No browser errors in valid captures. No >=50 ms browser long tasks were
  reported in the initial observation windows on this machine; that does not
  mean JavaScript execution is free.
- Plain curl Stats requests: **1,439–1,532 ms first byte in dev**, **1.8–2.2 ms in
  preview**. See `curl-proof.json` alongside the preview summary.

### Interpretation

Chart.js remains a reasonable payload/maintenance experiment, but these results
**do not support ECharts browser weight as the main cause of the two-second dev
load**. Server-side dev rendering/content access is the next profiling target
if we want to fix that delay. `src/pages/stats.astro` explicitly does substantial
archive calculations, intentionally relying on prerendering in production;
this measurement does not identify which specific server operation dominates.

The ~1 second animation is a separate contributor to perceived completion.
Changing libraries can accidentally change animation defaults, so future
comparisons must separate ready-frame timing from animation duration.

These static-page results **do not establish live server-island performance**.
The next approved review stage is an archived-data deferred-render probe, after
manual review of this baseline. Do not loosen the latest-only live action to
construct it.

## Build sizes

Credential-free build, **no Sentry integration**, same frozen dependencies and
content. Decimal kB; gzip/Brotli are local compression estimates, not measured
CDN transfers. Shared files counted once per page, including dependencies
requested after scrolling all charts into view:

| Browser JavaScript     | Raw/minified kB | Gzip kB | Brotli kB |
| ---------------------- | --------------: | ------: | --------: |
| Shared ECharts chunk   |           594.5 |   199.6 |     167.8 |
| Complete Stats page JS |           601.9 |   203.5 |     171.2 |
| Complete team page JS  |           597.5 |   201.3 |     169.3 |

The full emitted JS/CSS inventory, with client/server clearly separated, is in
`plan/baseline/runs/echarts-e2a8b30-preview/summary.json`. Server chunks are not
browser payload. HTML/inline scripts, fonts, CSS, images and third-party
analytics are not included in the page-JS totals above. Prior ad-hoc Python gzip
estimates differed slightly; this benchmark standardizes on Node's zlib for
both sides of the eventual migration.

## What is running for manual review

The frozen source copy is recorded in:

```sh
BASELINE="$(< /tmp/nbastt-echarts-baseline-path.txt)"
printf '%s\n' "$BASELINE"
```

Both servers are running from that copy, **not the working tree**. Editing the
working tree will not change these baseline pages.

| Page  | Dev                             | Built preview                   |
| ----- | ------------------------------- | ------------------------------- |
| Stats | http://127.0.0.1:4321/stats/    | http://127.0.0.1:4322/stats/    |
| Team  | http://127.0.0.1:4321/2025/CHA/ | http://127.0.0.1:4322/2025/CHA/ |

1. Open DevTools → Network. Use **No throttling** initially. With DevTools open,
   enable **Disable cache** and reload for a cold-browser approximation.
2. Select the main document request → Timing. Compare the long dev wait before
   the response with built preview. This is distinct from the chart script.
3. Filter for JS, then fonts. Watch the page while reloading: first chart
   appearance and the end of its animation are different moments.
4. Turn **Disable cache off** and reload to examine a warm visit. Hard reloads
   and an open DevTools cache-disable checkbox are not our warm-cache case.
5. In DevTools → More tools → Rendering, emulate
   `prefers-reduced-motion: reduce`, then reload. The extra animation should
   disappear. Restore `no-preference` afterward.
6. Scroll through all Stats charts. Exercise the existing keyboard/tooltip
   behavior if desired; this performance harness is not an accessibility test.

A browser-free cross-check, repeat several times:

```sh
curl -sS -o /dev/null -w 'first byte: %{time_starttransfer}s; total: %{time_total}s\n' http://127.0.0.1:4321/stats/
curl -sS -o /dev/null -w 'first byte: %{time_starttransfer}s; total: %{time_total}s\n' http://127.0.0.1:4322/stats/
```

The older React deployment at
https://trailing-slash.nba-surprise-teams.pages.dev/stats/ remains a secondary
manual reference, not a controlled numerical comparison. No hosted measurements
are claimed in this checkpoint.

## Repeat the automated measurement

From the working repository, with the two servers above running:

```sh
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4321 --revision e2a8b30 --out /tmp/echarts-dev-review
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4322 --revision e2a8b30 --dist "$BASELINE/dist" --out /tmp/echarts-preview-review
```

Use a new output directory each time. It writes detailed `measurements.json`,
a compact `summary.json`, initial-viewport screenshots and console timings.
The summaries contain per-run observations plus min/median/max; the label in
`--revision` is supplied by the operator, not independently verified by the tool.

`--paths /stats/` or `--paths /2025/CHA/` restricts a run. `--runs 1
--reduced-motion reduce` repeats the animation diagnostic. For true first-route
cold-dev measurements, stop dev, remove **that isolated copy's**
`node_modules/.vite` cache, restart, then capture one path before visiting it in
another browser. Repeat that process separately for the other path. The baseline
did this; simply repeating the commands against the already-running server does
not reproduce a cold server.

If restarting the existing isolated servers, stop their current processes first
(recorded in `/tmp/nbastt-echarts-baseline-pids.json`), then use separate terminals:

```sh
cd "$BASELINE"
env -u SENTRY_AUTH_TOKEN -u PUBLIC_SENTRY_DSN -u PUBLIC_DEPLOY_ENV mise x -- pnpm exec astro dev --host 127.0.0.1 --port 4321
# Other terminal, same directory:
env -u SENTRY_AUTH_TOKEN -u PUBLIC_SENTRY_DSN -u PUBLIC_DEPLOY_ENV mise x -- pnpm exec astro preview --host 127.0.0.1 --port 4322
```

For a fresh independent copy, export revision `e2a8b30` with `git archive`, trust
its reviewed mise config, install locked mise tools and run `pnpm install
--frozen-lockfile`, then `pnpm run build` through mise. Do not copy `.env` files or
supply Sentry credentials. A real local dependency installation matters: a first
attempt with symlinked external dependencies produced Vite 403s for fonts. That
capture was rejected, dependencies were locally cloned, and all valid captures
were rerun without changing the app's filesystem allowlist/configuration.

## Scope and evidence

- macOS, Apple M4 Pro, Chrome **152.0.7977.83**, headless, 1440×900, normal motion
  except the labeled diagnostic. No CPU/network throttling. Browser startup is
  outside the measurements. A fresh context is not a freshly booted machine.
- The observer adds small overhead. It watches DOM/visibility and font-load
  calls without editing application code. “Chart-ready frame” is two animation
  frames after the chart installs its slider role; it is a proxy, not a browser
  TTI metric or proof of completed paint/animation/interaction correctness.
- Mutation timing includes chart DOM activity, not a universal visual-completion
  metric. No slow-device, mobile, cross-browser or hosted-cache claims.
- Cold browser means a fresh context; warm means reload in the same context.
  Playwright request routing is deliberately avoided because it disables cache.
- Local build uses frozen content and no Sentry; keep that identical for Chart.js.
  The full build passed with **113 tests**. The capture and summarizer were also
  smoke-tested. Compact results are committed under `plan/baseline/runs/echarts-e2a8b30-*`;
  detailed resource/CPU captures remain in `/tmp/nbastt-echarts-raw-captures/`.
- User-owned `.gitignore` changes and `scr.js` remain untouched and outside this
  checkpoint. Nothing is deployed.

**Review gate:** stop here. After the user reviews these results and reproduces
loading locally, proceed to the archived-data server-island probe—not Chart.js
migration yet.

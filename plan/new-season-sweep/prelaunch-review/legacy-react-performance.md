# Review stop: pre-sweep React / Astro 5 performance

**Your memory is supported:** ordinary repeat dev navigation was substantially
faster before this sweep. The current dev regression is real; it is not merely a
misremembered cold start or a chart-readiness measurement artifact.

No historical application files were edited. Every tracked file in the isolated
copy was hash-checked against `f5382f317227bee436f1420cf9c5fbe861b1dbcc`.
No application fixes, chart migration, push or deployment in this round.

## Strongest comparison: HTML first byte

Five fresh browser contexts per page, each followed by a reload in the same
context. Median milliseconds, measured after the server reports ready:

| Page / browser cache | Pre-sweep dev | Current ECharts / Astro 7 dev |
| -------------------- | ------------: | ----------------------------: |
| Stats / cold browser |           223 |                         1,531 |
| Stats / warm reload  |           226 |                         1,481 |
| Team / cold browser  |            88 |                           704 |
| Team / warm reload   |            94 |                           685 |

Repeat dev HTML responses are approximately **6.5× slower for Stats and 7.3×
slower for the team page** in the recorded warm-reload medians. This metric does
not depend on React versus ECharts readiness markers: it precedes browser chart
execution.

A contemporaneous interleaved curl check confirmed the difference without any
browser JavaScript. After its post-restart first visit, old Stats took
**210–214 ms** versus current **1,459–1,470 ms**. Old team requests settled at
**82–83 ms** versus current **617–656 ms**. Both built previews served their
prerendered documents in a few milliseconds. All samples, including first
requests, are retained in `interleaved-curl.json`.

### Cold first visits are a different story

The very first request after starting dev and clearing that copy's optimizer
cache was expensive in the old stack too:

| First route visit | Old HTML first byte | Old first chart frame | Current first chart frame |
| ----------------- | ------------------: | --------------------: | ------------------------: |
| Stats             |            1,177 ms |              2,052 ms |                  1,832 ms |
| Team              |              944 ms |              1,251 ms |                    986 ms |

Those first visits are included in the five-run distributions, not discarded.
The old dev log also shows first-time image-service work. We cannot attribute
all initial delay to React compilation. Your memory of fast _repeat_ local
navigation fits the measurements much better than “the old stack was always
faster in every condition.”

## Browser chart timing

Median first chart frame, in milliseconds from navigation:

| Environment / page    | Old cold / warm | Current cold / warm |
| --------------------- | --------------: | ------------------: |
| Dev / Stats           |       340 / 298 |       1,665 / 1,545 |
| Dev / Team            |       250 / 168 |           834 / 756 |
| Built preview / Stats |        119 / 67 |            115 / 45 |
| Built preview / Team  |        120 / 65 |            114 / 44 |

**These chart markers are approximate, not identical:** the old renderer is
counted after hydration, a Recharts SVG exists, and two animation frames pass.
The current marker follows installation of its keyboard slider role and two
frames. Neither means animation completion, and the old marker does not claim
the new keyboard behavior. The shared harness records the marker in settings.

Built chart startup remains in roughly the same range locally. This reinforces
the previous finding: the large regression is in the current **dev server path**,
not an intrinsic two-second browser rendering delay.

### Animation contributes to the perceived difference too

The installed Recharts Bar default is **400 ms**, while its Area default is
**1,500 ms**. The current ECharts charts use the default roughly **1,000 ms**
animation when normal motion is enabled.

Observed first-Stats-chart DOM activity in built preview settled around
**620 ms from navigation in the old cold-browser samples**, versus roughly
**1,116 ms now**. Conversely, the old pace chart continued changing longer than
the current one. Mutation timing is not a universal visual-completion metric,
but it makes clear that animation behavior is not matched across libraries.

Thus, for Stats, both the much longer dev HTML wait and a longer bar animation
can contribute to the slower impression. Any Chart.js spike should choose
animation behavior explicitly rather than accidentally comparing new defaults.
No animation settings were changed for this comparison.

## Built browser-JS inventory

Local builds with Sentry credentials unset; all charts scrolled into view;
shared files counted once per page. Decimal kB, with Node zlib/Brotli estimates:

| Page / stack            | Raw/minified |  Gzip | Brotli |
| ----------------------- | -----------: | ----: | -----: |
| Stats / old React       |        655.3 | 196.1 |  165.3 |
| Stats / current ECharts |        601.9 | 203.5 |  171.2 |
| Team / old React        |        713.7 | 211.0 |  178.5 |
| Team / current ECharts  |        597.5 | 201.3 |  169.3 |

These exclude HTML/inline scripts, fonts, CSS, images, and server code. They are
not total page transfer sizes. The old build's `_worker.js/` directory is
explicitly excluded from browser assets and inventoried separately as server
code. Source builds without Sentry instrumentation differ slightly from the
earlier production-download estimate; this is the cleaner local comparison.

## Conditions and limits

- Old revision: `f5382f317227bee436f1420cf9c5fbe861b1dbcc`.
- Old tools: **Node 22.20.0 / npm 10.9.3**, installed via mise; `npm ci` against
  the historical lockfile in the isolated copy only. The old project specified
  Node `>=22 <23`, not an exact patch; this does not establish the patch version
  used in your original sessions. Current project tooling/pnpm settings unchanged.
- Locked old runtime: Astro **5.14.1**, Vite **6.4.1**, React **19.2.0**, Recharts
  **2.15.3**, Cloudflare adapter **12.6.10**, Wrangler **4.41.0**.
- Current reference: frozen `e2a8b30`, Node 26.8.1, Astro 7.3.1 / Vite 8.2.2 /
  ECharts 6.1.0, as recorded in the preceding baseline.
- Old preview uses **Wrangler Pages dev**; current preview uses the Astro 7
  adapter's preview server. Both serve local prerendered HTML, but they are not
  identical hosting stacks. This is a whole-stack regression comparison, not an
  experiment isolating one changed dependency.
- Same Chrome **152.0.7977.83**, Apple M4 Pro, 1440×900, normal motion, no CPU or
  network throttling, five fresh-context/reload pairs per page/environment.
  Capture tooling runs with current Node; the legacy application runs with Node 22.
- Same collection counts: 18,607 games, 30 seasons, 35 teams, 269 team seasons.
  Seasons/teams/teamSeasons are byte-identical. One game score differs between
  snapshots: `1996-11-10/CLE__DEN`, 108–79 then versus 101–86 now; winner unchanged.
  The old file was retained. Existing rounding/name/visual fixes also mean this
  is not a pixel-perfect parity target.
- No `.env` files copied; Sentry-related environment variables unset. No NBA/KV
  requests are needed for the two archived pages. No old live-island fixture was
  added; this round does not compare historical live rendering directly.
- The original build, type/format/lint checks and **10 legacy tests pass**. The
  legacy test runner emitted a Vite shutdown warning despite exiting
  successfully. This is not equivalent coverage to the current 113-test suite.
- The rejected pre-ready connection attempt and inventory-directory error are
  not measurements. Valid captures were rerun; slow successful first visits were
  retained. No successful slow samples were removed.

## Review it yourself

Servers are running from separate frozen copies, not the working source tree:

| Page  | Old dev                         | Current dev                     |
| ----- | ------------------------------- | ------------------------------- |
| Stats | http://127.0.0.1:4325/stats/    | http://127.0.0.1:4321/stats/    |
| Team  | http://127.0.0.1:4325/2025/CHA/ | http://127.0.0.1:4321/2025/CHA/ |

| Page  | Old built preview               | Current built preview           |
| ----- | ------------------------------- | ------------------------------- |
| Stats | http://127.0.0.1:4326/stats/    | http://127.0.0.1:4322/stats/    |
| Team  | http://127.0.0.1:4326/2025/CHA/ | http://127.0.0.1:4322/2025/CHA/ |

1. Open the old and current dev pages. Give each one a first visit, then reload
   twice. Your normal repeat-navigation experience is the useful comparison.
2. In DevTools Network, use **No throttling** and leave **Disable cache off** for
   warm reloads. Inspect the document request's Timing / waiting for response.
3. Enable **Disable cache** for a cold-browser approximation. This does not reset
   the server/compiler caches. Watch HTML appearance, first chart appearance
   and animation completion as three different events.
4. Repeat with both built previews. They should feel much closer than dev.
5. Keep motion preferences consistent. Do not assume the old charts implement
   the current reduced-motion or keyboard behavior.

Independent of browser state, repeat:

```sh
curl -sS -o /dev/null -w 'old Stats first byte: %{time_starttransfer}s\n' http://127.0.0.1:4325/stats/
curl -sS -o /dev/null -w 'new Stats first byte: %{time_starttransfer}s\n' http://127.0.0.1:4321/stats/
```

### Repeat the automated captures

From the working repository, use new output directories:

```sh
OLD="$(< /tmp/nbastt-react-baseline-path.txt)"
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4325 --renderer react --revision f5382f3 --out /tmp/react-dev-review
mise x -- node plan/baseline/chart-performance.mjs --base http://127.0.0.1:4326 --renderer react --revision f5382f3 --dist "$OLD/dist" --dist-layout legacy --out /tmp/react-preview-review
```

For cold-server first visits, stop old dev and remove **only that copy's**
`node_modules/.vite`, restart and wait for the ready message, then capture
`--paths /stats/` before visiting it manually. Repeat the restart/cache-clear
sequence separately for `--paths /2025/CHA/`. Normal captures against the running
server do not recreate a cold server.

The current background PIDs are in `/tmp/nbastt-react-baseline-pids.json`.
If restarting, stop the existing processes first. In the isolated old copy:

```sh
# Dev, in one terminal:
env -u SENTRY_AUTH_TOKEN -u PUBLIC_SENTRY_DSN -u PUBLIC_DEPLOY_ENV mise x node@22.20.0 -- node node_modules/astro/astro.js dev --host 127.0.0.1 --port 4325
# Built Pages preview, in another terminal:
env -u SENTRY_AUTH_TOKEN -u PUBLIC_SENTRY_DSN -u PUBLIC_DEPLOY_ENV mise x node@22.20.0 -- node node_modules/wrangler/bin/wrangler.js pages dev dist --ip 127.0.0.1 --port 4326
```

To reconstruct independently, start in the working repository:

```sh
LEGACY="$(mktemp -d /tmp/nbastt-react-review.XXXXXX)"
git archive f5382f317227bee436f1420cf9c5fbe861b1dbcc | tar -x -C "$LEGACY"
mise install node@22.20.0
cd "$LEGACY"
mise x node@22.20.0 -- npm ci
mise x node@22.20.0 -- node node_modules/wrangler/bin/wrangler.js types
env -u SENTRY_AUTH_TOKEN -u PUBLIC_SENTRY_DSN -u PUBLIC_DEPLOY_ENV mise x node@22.20.0 -- node node_modules/astro/astro.js build
```

Then use the server commands above. Do not copy current dependencies, change the
historical lockfile, copy credentials or deploy this application. Stop dev before
running builds/checks/tests in its copy, and restart afterward to avoid stale
optimizer references.

Compact results and environment details are committed under
`plan/baseline/runs/react-f5382f3/`. Detailed captures/screenshots remain in
`/tmp/nbastt-react-dev-stats/`, `/tmp/nbastt-react-dev-team-valid/`, and
`/tmp/nbastt-react-preview-valid/`. Legacy server logs are
`/tmp/nbastt-react-dev-review.log` and `/tmp/nbastt-react-preview-review.log`.

**Pause for manual review.** This confirms the regression and complements the
previous dev-lookup A/B/A diagnosis; it does not authorize an Astro downgrade,
dependency patch, animation change or Chart.js migration yet.

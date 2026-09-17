# Experiment 1: old/current frontmatter timing — review stop

**The data-preparation stages differ substantially.** The regression is visible
before browser JavaScript, fonts or chart drawing. It is concentrated in repeated
entry lookups/calculations and, on the team route, repeated dev path generation.
It is not a uniform slowdown of all data access.

Only disposable copies were instrumented. Application revisions remain
`f5382f3` (Astro 5 / React, Node 22.20.0) and `e2a8b30` (Astro 7 / ECharts,
Node 26.8.1). Existing review servers on 4321–4326 are unchanged. No dependency
patch, helper optimization, font change, chart migration, push or deployment.

## Warm dev results

Five serial repeat requests per route/stack, following a separately retained
first route visit. Old/current request order alternates. Median milliseconds:

| Stage                                                      |         Old |              Current |
| ---------------------------------------------------------- | ----------: | -------------------: |
| Stats: complete page frontmatter                           |     **212** |            **1,436** |
| Stats: document first byte                                 |         228 |                1,485 |
| Team: page frontmatter                                     |          44 |                    1 |
| Team: team-stats/index frontmatter                         |          35 |                    1 |
| Team: team-stats/ui frontmatter                            |     **3.2** |              **114** |
| Team: getStaticPaths, combined per serial request interval | **0 calls** | **2 calls / 488 ms** |
| Team: document first byte                                  |          94 |                  680 |

The old team route executes `getStaticPaths()` on its first visit, then reuses
that result. The current route executes it **twice in every recorded repeat
request interval**, enumerating the same 269 team seasons each time. The two
measured calls do not overlap and precede the page/UI work. Their combined
median is 488 ms; the repeat interval range is 446–541 ms.

These path calls occur outside the middleware's request context. The measurement
is a **serial-request observation**, not a claim that we traced every internal
caller or proved why Astro invokes it twice. It matches the previously observed
538 team plus 538 season lookups outside the middleware trace.

### Stats frontmatter breakdown

| Stage                                   | Old | Current |
| --------------------------------------- | --: | ------: |
| Initial archive/collection retrieval    |  86 |       4 |
| Top-ten calculation and row preparation |  36 |     299 |
| Surprises-per-season data               |   9 |     167 |
| Surprises-by-team data                  |  35 |     183 |
| Scatter data                            |  46 |     750 |

The inexpensive collection retrieval is **not** where the current penalty sits.
The repeated calculation/entry-resolution stages dominate. In team UI, chart
point preparation rises from about **3 ms to 110 ms**; summary helpers rise from
about **0.2 ms to 5 ms**. Medians of individual phases need not sum to the median
of the whole frontmatter span.

This supports the earlier controlled asset-import A/B/A result. It does not
independently isolate Astro from Vite, the adapter, Node versions, or application
changes across the two complete historical stacks. The `getSeasonArchive()`
application helper is identical in both snapshots; framework implementation and
execution context can change its cost despite unchanged calling code.

## Actual build-time prerendering: a useful cross-check

One complete build of each instrumented copy, with Sentry credentials unset:

| Frontmatter during build |    Old |        Current |
| ------------------------ | -----: | -------------: |
| Stats                    | 215 ms |         110 ms |
| Team page                |  38 ms | <1 ms reported |
| Team index               |  38 ms |           1 ms |
| Team UI                  | 1.1 ms |           1 ms |

The current build does **not** reproduce the 1.4-second Stats frontmatter delay.
Both builds call this team's route `getStaticPaths()` once: about 4 ms old and
30 ms current. Do not read that small single-run difference as a production
regression: traversal order differs, with old Stats rendered before this path
generation and current path generation before Stats. Initialization/cache state
is consequently different.

These are build observations, **not** five-run medians or hosted/live-response
measurements. Built archived pages serve the generated HTML; this work is not
repeated on each production visit. The earlier fixture-island experiment remains
the evidence about current on-demand rendering.

## First visits retained

Fresh servers/optimizer caches were used separately for Stats and Team:

| First route visit               |               Old |            Current |
| ------------------------------- | ----------------: | -----------------: |
| Stats frontmatter               |            646 ms |           1,485 ms |
| Stats HTML first byte           |          1,058 ms |           2,390 ms |
| Team path generation, all calls | 405 ms / one call | 583 ms / two calls |
| Team HTML first byte            |            857 ms |           1,875 ms |

Static imports, module transformation/evaluation and template rendering are not
inside the frontmatter timer. They can contribute to the first-visit gap between
frontmatter and the HTTP response. No slow successful samples were discarded.

## Instrumentation and checks

- `prepare-frontmatter-profile.mjs EXTERNAL_COPY` adds simple `performance.now()`
  spans to page frontmatter, team index/UI and shared Logo frontmatter. Stats
  also has phase marks. The team route's `getStaticPaths()` has its own timer.
- Frontmatter starts before the first data/props statement and ends before the
  template. Static imports are excluded. Child spans are separate, not included
  in the parent's frontmatter timer. We do not sum potentially overlapping child
  spans or call any result exclusive CPU time.
- Middleware supplies an AsyncLocalStorage request label, without buffering the
  response or changing headers. Prerenderable dev pages can sanitize request
  headers/query strings; a server-generated sequence label handles that case.
  `getStaticPaths()` deliberately remains unlabelled when outside that context.
- Logger formatting/output occurs **after** the measured span. It can still add
  request overhead, so interleaved checks against untouched baseline servers were
  performed (one warm-up plus five repeats):

  | HTML first byte |  Untimed |    Timed |
  | --------------- | -------: | -------: |
  | Old Stats       |   216 ms |   223 ms |
  | Current Stats   | 1,479 ms | 1,438 ms |
  | Old Team        |    82 ms |    78 ms |
  | Current Team    |   645 ms |   662 ms |

  These separate-process comparisons include ordinary run-to-run variation;
  they are not precise overhead estimates. They show that instrumentation is not
  creating the observed multi-hundred-millisecond/second gap.

- Current runtime timers report whole milliseconds. A separate, temporary fixed
  CPU-loop route confirmed that the clock advances during CPU work locally:
  roughly 15–17 ms old and 16 ms current, then about 26–27 ms including a timer
  yield. We do not treat a reported zero as literally zero CPU cost. This does
  not establish clock behavior in hosted Workers. The temporary route was removed.
- Logo timings are recorded but not used for a performance comparison: old Logo
  passes an unresolved image-source promise into Astro's Image component, whereas
  current Logo awaits its asset in frontmatter. Those are different boundaries.
- Both instrumented builds and Astro typechecks pass. The generator's output was
  reproduced from clean archives and compared byte-for-byte. Current Astro's
  dependency runtime still hash-matches the untouched dependency
  (`5de18556061cea7ea4d243f3b363f9ed08c567ac`). No import-cache experiment is active.
- Setup attempts that failed marker/request-label validation were rejected and
  both servers restarted/cache-cleared before the retained first-visit captures.
- Primary request/span measurements use **curl only**: no browser JS execution,
  fonts, animation, network throttling, NBA refresh, or live KV request. Separate
  Chrome smoke checks passed both pages in each copy after the final restart.
  Dataset and
  historical-toolchain caveats remain those of the preceding
  [React comparison](legacy-react-performance.md).

## Review and reproduce

The new diagnostic copies are recorded in `/tmp/nbastt-frontmatter-paths.json`;
processes in `/tmp/nbastt-frontmatter-pids.json`. They are running after their
builds/checks, with fresh dev servers to avoid stale optimizer references.

| Page  | Old diagnostic dev              | Current diagnostic dev          |
| ----- | ------------------------------- | ------------------------------- |
| Stats | http://127.0.0.1:4327/stats/    | http://127.0.0.1:4328/stats/    |
| Team  | http://127.0.0.1:4327/2025/CHA/ | http://127.0.0.1:4328/2025/CHA/ |

The timers log to the **server logs**, not the browser console:

```sh
tail -f /tmp/nbastt-frontmatter-old.log /tmp/nbastt-frontmatter-current.log
```

Look for `[frontmatter-profile]` JSON. Filter by `name` (`stats`, `team-page`,
`team-index`, `team-ui`, `team-getStaticPaths`), `request`, and `path`. Old/current
clocks have different origins; compare durations, not their absolute `start`.

For the cleanest manual check, make one request at a time:

```sh
curl -sS -o /dev/null -w 'old Stats TTFB: %{time_starttransfer}s\n' http://127.0.0.1:4327/stats/
curl -sS -o /dev/null -w 'new Stats TTFB: %{time_starttransfer}s\n' http://127.0.0.1:4328/stats/
# Replace /stats/ with /2025/CHA/ for the team route; repeat each request.
```

From the working repository, capture both pages automatically to a **new** file:

```sh
mise x -- node plan/baseline/capture-frontmatter-profile.mjs --out /tmp/frontmatter-review.json
```

Do not browse the diagnostic ports concurrently during capture. The script
rejects multiple labelled requests/other profiled routes and missing page/UI
spans, but unlabelled path-generation events require a quiet serial run. It
records one first request plus five repeats; against already-running servers,
that first request is **not** a cold-server measurement.

### Reconstruct the copies

1. Export `f5382f3` and `e2a8b30` into separate external directories. Use the
   historical/current locked dependencies and Node versions described in the
   preceding baselines; do not symlink dependencies outside the copies. We used
   local copy-on-write dependency clones from the frozen baseline copies.
2. From the working repository, run the preparer once per copy:

   ```sh
   mise x -- node plan/baseline/prepare-frontmatter-profile.mjs /path/to/old-copy
   mise x -- node plan/baseline/prepare-frontmatter-profile.mjs /path/to/current-copy
   ```

   It refuses the working source tree and repeat preparation. All expected source
   markers are validated before writing the instrumented files.

3. Unset Sentry credentials/DSN/deployment environment and use the respective
   mise-managed Node binary. Old CLI: `node_modules/astro/astro.js`; current CLI:
   `node_modules/astro/bin/astro.mjs`. Run `dev --host 127.0.0.1 --port 4327` old
   and `--port 4328` current, redirecting logs to the paths above. Both copies may
   otherwise inherit local environment settings; do not copy `.env` files.
4. Wait for both ready messages. Capture `--paths /stats/` before visiting either
   page. Stop both diagnostic dev processes, clear only their generated
   `node_modules/.vite` / `.vite-temp` caches, restart, and capture
   `--paths /2025/CHA/` to obtain independent first-route visits.
5. For build observations, stop dev, run each CLI's `build`, save stdout, and
   inspect the same JSON records. Generate Worker types and run `astro check`
   while dev is stopped. Restart afterward. Do not run builds/checks against a
   serving copy's optimizer cache.
6. Optional timer check: copy `plan/baseline/frontmatter-clock-probe.ts` into the
   diagnostic copy as `src/pages/clock-probe.ts`, request `/clock-probe/`, and
   remove it afterward. Never deploy this diagnostic route or instrumentation.

Evidence is in `plan/baseline/runs/frontmatter-comparison/`: both complete dev
captures, build records, untimed controls and clock checks. Raw first-visit logs
are `/tmp/nbastt-frontmatter-{old,current}-{stats,team}.log`; build/typecheck logs
use the same prefix with `-build.log` / `-types.log`.

**Stop here for review.** Experiment 1 confirms the server-side dev bottleneck.
Font preloading/wait removal and client-side data/rendering changes remain
separate, unstarted experiments.

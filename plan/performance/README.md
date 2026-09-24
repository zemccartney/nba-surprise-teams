# Post-season-start performance audit

**Deferred by Zack on 2026-09-24.** Schedule sustained, focused work after season
start. This supersedes the brief request to promote font work into Season prep.
Performance is acceptable for cutover. No performance experiment was deployed:
CSS inlining and Iosevka preloading changes were reverted, and comparison servers
were stopped. The isolated Worker preview remains unchanged.

## Starting evidence

[Hosted mobile PSI report](https://pagespeed.web.dev/analysis/https-nbastt-preview-zemccartney-workers-dev-stats/mziwo6zh0q?form_factor=mobile)
for `/stats/`, September 23 at 22:19 EDT:

- Performance 61; automated accessibility, best practices and SEO 100.
- FCP 6.2s, LCP 6.8s, TBT 0ms, CLS 0; no field data.
- Render-blocking stylesheet: approximately 10.7 KiB transferred. The reported
  4.69s potential saving is a simulation, not the stylesheet's 170ms transfer.
- Critical-chain font: Iosevka Curly **700**, approximately 967 KiB.
- LCP candidate: a 36px Detroit logo, not chart readiness.
- Approximately 72 KiB of initial-load unused JS: chart code and Sentry.
  Offscreen lazy-mounted charts may legitimately leave code unused during this
  recording. Coverage is not proof that the code can simply be deleted.

Do not assume the score is caused by graphics or main-thread chart execution.
Resource discovery, fonts and layout need tracing independently.

## Font facts and future work

We import **two static weights (400 and 700)**, not every Iosevka weight. Their
WOFF2 files total **1,972,808 bytes**. Both files already have a Latin label;
that does not guarantee small glyph or OpenType layout tables. Inspect the actual
font tables before attributing the size to a particular feature.

Investigate a smaller build/subset while preserving the accepted appearance,
both weights, shaping, historical/future team names, accents, punctuation and
mathematical symbols. Dynamic tooltips must be covered, not just current static
HTML. Inspect licensing, retain required notices, document reproducible generation
and test missing-glyph/fallback behavior.

Evaluate Astro's Fonts API alongside this work: declarative preload controls and
fallback metrics may help, but the API alone does not guarantee smaller files.
Sixtyfour and ChicagoKare are already preloaded. Iosevka uses `font-display: swap`;
the application no longer waits for fonts, and TanStack handles late remeasurement.

## Small experiments — not shipped

Built four variants from an independent clone/dependency tree at `6be2e6c`:

1. Baseline.
2. `build.inlineStylesheets: "always"` (instead of default `auto`).
3. Preload only Iosevka 700 on Stats and team-season pages.
4. Both changes.

`paint-candidates.patch` preserves the proposed application changes; apply only
the config hunk for inline-only, or only the layout/page hunks for preload-only.
`stats-paint.json` records the measurements. Harness:
`../baseline/chart-paint-network.mjs`.

### Controlled local Stats results

Three rotated cold-context runs per variant, Chrome 153.0.8010.53, 390×1000,
local gzip HTTP, cache disabled, CDP 150ms latency / 200,000 B/s download /
93,750 B/s upload, 4× CPU slowdown. Sentry integration was absent consistently
from these local builds. These are **not Lighthouse scores**, hosted timings,
repeat-navigation measurements or chart-interactivity benchmarks.

| Variant     | Median FCP | Median LCP | Observed shift sum |
| ----------- | ---------: | ---------: | -----------------: |
| Baseline    |      528ms |      656ms |             0.0021 |
| Inline CSS  |      360ms |      788ms |             0.1354 |
| Preload 700 |      680ms |      748ms |             0.0021 |
| Both        |      360ms |      596ms |             0.1354 |

The harness's `cls` field sums observed shifts excluding recent input; it is not
an implementation of Lighthouse's maximum-session-window CLS algorithm.

**Interpretation:** inlining improved first paint but exposed substantial visible
reflow. Preloading the large bold face alone slowed first paint; earlier discovery
did not justify giving this request priority. Neither change was accepted.
Inlining also increased compressed Stats HTML from about 9.5KB to 20KB and gives
up separate stylesheet caching on later navigation.

A diagnostic trace of inline-only showed a large table-row shift around 442ms:
several rows shrank from 96px to 68px and a lower row moved upward 140px. This
followed ChicagoKare completion around 408ms. A smaller title-font shift happened
earlier. Font-related table reflow is a strong lead, not an isolated causal proof.
Investigate before reintroducing early paint; do not hide the regression with a
font wait or claim the FCP gain alone is a win.

Only Stats was measured in this round. Any future candidate needs team pages,
home/archives, multiple widths, warm navigation, font failures/delays, visual and
keyboard checks, actual hosted builds with Sentry, and repeated Lighthouse runs.

## Reproduction

Create independent build directories for baseline/inline/preload/both, using
`CLOUDFLARE_ENV=preview PUBLIC_DEPLOY_ENV=preview` and the same dependency lock.
For these local controls, Sentry credentials were empty in all variants.
Serve each with `../baseline/serve-static-gzip.mjs` on separate loopback ports.
Pass the harness a JSON array of `{ "name": "baseline", "base": "http://127.0.0.1:PORT" }`
entries plus an output filename. It rotates the variant order across three runs.
Stop all servers afterward. Do not enable deployment or alter production bindings
as part of benchmarking.

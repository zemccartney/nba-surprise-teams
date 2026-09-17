# SQLite persistence pilot and Node-prerender control

**Review gate: compatibility proven; full migration not started.** No root app
configuration, page, content consumer, live loader, action or binding changed.
No dependency was added. Prototype code, SQL snapshot and tasks are in
[`plan/sqlite-spike/`](../../sqlite-spike/README.md); the integration is enabled
only in disposable copies. User-owned `.gitignore` and `scr.js` were preserved.

## Most important result: separate persistence from performance

A separate `e2a8b30` archive changes **only** this adapter option:

```js
prerenderEnvironment: "node";
```

All 283 tracked files were byte-verified against that revision, allowing only
that insertion in `astro.config.mjs`. This copy contains no SQLite integration.
The reference remains the frozen workerd `e2a8b30` server on port 4321.

| Original, unchanged page | Workerd warm TTFB | Node warm TTFB |
| ------------------------ | ----------------: | -------------: |
| Stats                    |          1,404 ms |         116 ms |
| 2025 Charlotte           |            621 ms |           5 ms |

Five serial warm requests per page/environment, alternating stack order, curl
only. First requests to the new Node server were 589 ms Stats and 70 ms team;
the long-running reference's first retained requests are **not** cold-server
comparisons. No browser, fonts, animation or SQLite queries enter this control.

Thus Node prerender alone removes most of the measured dev penalty for these
pages. SQLite remains attractive for explicit relational ownership, queries,
constraints and a reviewable data workflow—not as a necessary performance fix.
This does not trace the exact prior route-cache misses or prove attribution to
any researched upstream invalidation bug. Workerd remains the live-runtime
backend for islands/actions; the option changes prerender execution, not the
production Worker runtime.

Control review: <http://127.0.0.1:4331/stats/> and
<http://127.0.0.1:4331/2025/CHA/>. Source/PID details are in
`/tmp/nbastt-node-prerender-control.json`.

## SQLite compatibility result

- Native Node `node:sqlite`, SQLite 3.53.4 under pinned Node 26.8.1.
- Canonical SQL preserves every current JSON record/field: 18,607 games,
  35 teams, 30 seasons, 269 team seasons; deterministic read-transaction dump
  with primary-key ordering and restore refusal on an existing destination.
- Plain catalog/domain records, not an emulation of Astro collection entries.
- Read-only, short-lived SQLite handles for Node prerender; generated static
  metadata for workerd. All metadata is 19,256 JSON bytes, excluding games.
- Dev writes have an explicit revision signal. Database/journal/WAL/SHM I/O is
  not source HMR; direct external edits require notification.
- Build restores the version-controlled dump into a fresh temporary DB. One
  build ignored deliberately divergent local odds; the final build passed
  with no local DB at all. Local build reads working dump bytes, while a clean
  deployment checkout supplies the committed bytes.
- Worker metadata is fixed after build. In the live design, games still come
  from NBA/KV; the pilot receives archived game fixtures as island props.

The configuration-only control also means a smaller Node-prerender-only
application change is a viable next choice. Do not infer approval for a full
SQLite migration from this result; stop for manual review of both choices.

## Data and correctness checks

**127 tests across 13 files** pass, including the existing 113 tests and 14
new persistence/domain/CLI tests. The new tests cover:

- SQL restore/dump byte round-trip, refusal to overwrite, and JSON import parity.
- All metadata and all archived games, plus every existing team-season chart
  point, threshold, record, season rule and historical name against real
  current helpers using typed fresh-content fixtures.
- Foreign keys, duplicate identities, strict half-win odds, invalid dates,
  same-team games and unfinished/tied archive scores.
- New odds, intentional updates, rejected duplicate writes, invalid CLI input,
  inspection output and unknown seasons.
- A real Git index: fresh staged dump passes; DB change plus fresh working
  dump but stale staged blob fails; re-staging passes.

`data:check` runs with normal hk checks; pre-commit additionally compares the
actual staged SQL blob. An absent DB skips only drift comparison, not the
restore/parity tests. No new permanent verification exclusion was introduced.

The prototype does not yet replace the complete schema/domain-validation
surface or provide released schema migrations, a season editor or the future
optional NBA-ID storage contract. Existing tests remain. Those are migration
requirements, not reasons to pretend this is already the production store.

## Runtime exclusion proof

The environment-aware virtual catalog resolves to Node SQL only in
`prerender`, and to plain embedded metadata in workerd. Archive imports from
outside Node prerender fail explicitly. The module graph and generated code
are checked for native SQLite, the Node-only database module and its marker.

The independent final audit checks chunk hashes, final HTML/JS/source maps,
and DB/SQL-file exclusion under `dist/client` and `dist/server`. Reports sit
outside the deployment directories. **74 Worker chunks and 9 separate browser
chunks** pass. The old Astro archive store remains in this partial build;
fixture props also carry 82 games. Neither is SQLite machinery, and neither
should be confused with the new metadata-only catalog.

Negative controls retained:

1. Inject a real `node:sqlite` import/constructor into the island in another
   disposable copy: build fails with `SQLite machinery leaked into ssr`.
2. Change a copied emitted Worker chunk: independent audit fails its hash.
3. Compare stale staged data against a fresh working dump: drift gate fails.

Two implementation corrections were made before accepting measurements:

- Astro rewrites its manifest and inlines/removes small client entries after
  Rollup. Provisional chunk hashes were correctly rejected; sealing moved to
  the final build hook, with final HTML included in the independent scan.
- The SSR dependency scanner also visits prerender source files. Virtual data
  modules are excluded from dependency prebundling **per environment**;
  actual Worker archive imports still fail. A global-only exclusion did not
  fix the scan error and was replaced. No Vite/Astro dependency was patched.

## Dev refresh and browser verification

Direct external SQL changed the Node page immediately, but left the already
loaded Worker snapshot unchanged. Explicit notification automatically reloaded
an open island with the updated metadata. The built preview stayed fixed.
All fictitious 2026 odds were removed; the review copies show no 2026 Charlotte
entry. CLI mutations notify after successful commits; external editors must
notify explicitly.

Both pilot paths match all 82 reference chart points and thresholds, mount,
remove island fallback, support keyboard End, and report no browser errors.
Island responses are 200/no-store on every navigation. Astro parent scope
attributes and dev/built asset URLs are deliberately not semantic comparisons;
the expected logical emoji is checked separately. Additional 390/1440px smoke
checks cover both pilot paths in dev/preview and the Node-only original team/Stats
pages: every chart mounts, End selects the final point, Escape hides a shown
tooltip, and no horizontal overflow, browser errors or failed HTTP assets occur.

### Diagnostic page timings

One first browser visit followed by five warm reloads per path/environment,
Chrome 152, 1440×900, normal motion, no throttling, no Sentry credentials.
Readiness is the slider role plus two animation frames—not animation end.

| Diagnostic path       | First TTFB / chart frame | Warm median TTFB / chart frame |
| --------------------- | -----------------------: | -----------------------------: |
| Dev SQLite archive    |              20 / 231 ms |                     3 / 107 ms |
| Dev metadata island   |            12 / 1,407 ms |                     7 / 174 ms |
| Built SQLite archive  |              17 / 155 ms |                      2 / 90 ms |
| Built metadata island |               3 / 171 ms |                      2 / 90 ms |

The first dev island request took 803 ms, including cold module/optimizer work;
five warm responses had a 53 ms median. Built island responses were 23 ms first
and 7 ms warm. The Node archive SQL/calculation span was about 1 ms, while the
workerd calculation clock often reported 0 ms at its whole-ms precision; zero
is not zero cost. These spans exclude chart assets, rendering and animation.

These diagnostic shells are not equivalent to the full team UI and are not a
whole-site speedup claim. An initial capture with a dependency-scan failure
was rejected; the retained final capture uses the corrected integration.
The configuration-only original-page control above is the relevant isolation
of the environment change. No font or chart-library experiment ran.

## Review/reproduction

The [hands-on guide](../../sqlite-spike/README.md) covers safe scratch odds
entry, inspection, updates, deterministic dumps, staged checks, dev refresh,
build exclusion, browser testing and generating another disposable copy.

- Dev archive: <http://127.0.0.1:4329/sqlite-spike/archive/>
- Dev island: <http://127.0.0.1:4329/sqlite-spike/island/>
- Built equivalents: port 4330.
- Directory/PIDs: `/tmp/nbastt-sqlite-pilot-path.txt`,
  `/tmp/nbastt-sqlite-pids.json`.
- Logs: `/tmp/nbastt-sqlite-{dev,preview}-review.log`,
  `/tmp/nbastt-sqlite-final-{verify,build,audit}.log`.
- Committed compact evidence:
  [`plan/baseline/runs/sqlite-pilot/`](../../baseline/runs/sqlite-pilot/).

The full disposable-copy verification (types, formatting, lint, workflow
checks and tests), credential-free build, generated Worker types and artifact
audit passed. A fresh generator run reproduces all five generated config/page/
component files byte-for-byte; main-repo hk checks also pass. Stop that copy's dev
server before build/check/test and clear
only its generated optimizer caches before restarting. Earlier reference
servers were not altered. Hosted NBA/KV/Sentry, screen-reader review, stack
reconciliation and deployment remain separate coordinated work.

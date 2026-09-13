# Independent validation notes

These checks were performed by the coordinating assistant after/beside the two
independent reviews. They are distinct from reviewer source inspection and from
the earlier approved visual walkthrough. Finding IDs refer to `README.md`.

Original CLI streams, prompt, process metadata and scratch evidence remain under
`/tmp/nbastt-prelaunch-review/` for this session. They are not durable test-suite
fixtures. Reviewer report copies here have formatting changes only; their
absolute source links refer to temporary snapshots.

## R2: empty and stale content tests

All destructive fixture changes were made in a **disposable validation copy**,
never the working repository. Test instrumentation added only a collection-count
log. The production preview remained running separately.

Commands used in that copy included:

```sh
mise x -- pnpm exec vitest run tests/system.test.ts --silent=false --reporter=verbose
mise x -- pnpm exec astro sync
# Sentry upload disabled for this local validation:
env -u SENTRY_AUTH_TOKEN mise x -- pnpm exec astro build
# Populate the dev content store, then stop its server before changing data:
env -u SENTRY_AUTH_TOKEN mise x -- pnpm exec astro dev --background --port 4341
mise x -- pnpm exec astro dev stop
```

| State                                         | Collection counts: games / seasons / teamSeasons | Result             |
| --------------------------------------------- | ------------------------------------------------ | ------------------ |
| Fresh store                                   | 0 / 0 / 0                                        | 10 passed          |
| After sync and build, no dev store            | 0 / 0 / 0                                        | 10 passed          |
| After dev start/stop                          | 18,607 / 30 / 269                                | 10 passed          |
| Remove one raw game; do not refresh dev store | 18,607 / 30 / 269                                | 10 passed          |
| Refresh dev store with that game still absent | 18,606 / 30 / 269                                | 1 failed, 9 passed |

Removed fixture game: `2026-04-12/POR__SAC`. The final failure was the existing
past-season completeness assertion: **expected 81 to be 82**. This is a useful
positive control: the assertion works when it receives the actual changed data.

The first fresh experiments also redirected Vite's cache for isolation. That
setting was removed, and the normal config reproduced the empty-store result
before dev startup and the stale-store result afterward. These findings do not
rely on the temporary cache override.

Installed Astro source `dist/content/paths.js` selects the dev data store from
`settings.dotAstroDir` and the build store from `settings.config.cacheDir`.
A build therefore cannot be assumed to refresh the data read by this test setup.

The current working repository's verbose system-test run passed without the
empty-collection symptoms, consistent with its previously populated dev store.
That does not validate a clean checkout or freshness after future JSON edits.

Scratch evidence:

- `fresh-store-tests.txt`, `stale-real-config-tests.txt`
- `dev-warmed-tests.txt`, `dev-stale-tests.txt`
- `refreshed-invalid-data-tests.txt`
- `validation-build.txt`, `current-root-tests.txt`

## R3: font failure against production and preview

Using system Chrome through `plan/baseline`'s `playwright-core`, abort font
requests before navigating to `/stats/` and inspect the three chart hosts after
lazy mounting.

| Target                     | Result with aborted fonts                       |
| -------------------------- | ----------------------------------------------- |
| Production                 | All three Recharts SVGs still render            |
| Built preview on port 4322 | Zero chart SVGs; three uncaught `NetworkError`s |

Code inspection explains the unrecoverable state: mounting is recorded and the
observer disconnected before the awaited font promise rejects. `echarts.init()`
and keyboard initialization are never reached.

This is a font-**failure** test, not a recommendation to change font files or the
approved appearance. A hanging request is an additional case to cover when fixing
initialization; it was not separately reproduced here.

## R4–R5: pointer/keyboard interaction

System Chrome, 1440×900, reduced motion, built preview `/stats/` on port 4322.
Focus a navigation link, scroll the scatter into view, and select the highest
scatter point (2013–14 Phoenix Suns). Wait for rendering between steps.

Observed output, rounded to CSS pixels:

```text
Hover Phoenix:
  host focused: false
  tooltip: '13-14 Phoenix Suns; visible: true
  outlined points: [(952.08, 246.72)]

Press Escape without moving the mouse:
  host focused: false
  tooltip remains visible
  outlined points: [(952.08, 246.72)]

Click Phoenix:
  host focused: true
  tooltip still describes Phoenix
  outlined points: [(952.08, 246.72), (864.29, 502.72)]

Move 0.2 CSS pixels within Phoenix:
  both outlines remain
```

The second location belongs to the initial keyboard selection (2014–15
Philadelphia). This establishes the click/hover bug, not merely a possible
source-level interaction. Touch and other browsers still need the corresponding
regression cases after the fix.

## R1, R6, R7, R9: workflow/configuration checks

- Both builds use the same Worker name and KV binding declaration; no separate
  binding environment is selected. `PUBLIC_DEPLOY_ENV` controls application
  configuration, not Cloudflare resource isolation. The action writes through
  that binding. **No hosted write or deployment was attempted.**
- Simulated short-ref versus full-ref conditions:

  ```text
  refs/heads/main         ref_name == main: true   exact main branch: true
  refs/heads/chart-parity ref_name == main: false  exact main branch: false
  refs/tags/main          ref_name == main: true   exact main branch: false
  ```

- Read the current public [Cloudflare preview URL documentation](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/).
  It explicitly requires lowercase letters/numbers/dashes, an initial letter,
  and alias + dash + Worker name ≤63 characters. No alias upload was attempted.
- The deployment job-level condition covers install/build. No separate
  repository verification workflow was present. Pages dashboard settings were
  not inspected.

## R8: invoke the actual optimizer hook

Imported `svg-optimizer/integration.ts` using Node's TypeScript support. Created
a real temporary `NBA Tracker/client/` directory, passed its `file:` URL to
`astro:config:done`, then invoked `astro:build:done` with a no-op logger.

```text
Actual optimizer hook:
  ENOENT .../NBA%20Tracker/client/

Fs.readdir(fileURLToPath(clientUrl)):
  []
```

This exercised the integration itself, not just a hypothetical URL conversion.
It did not change any application SVG or run another production build.

## R10: generated-type prerequisite

In the disposable copy only, temporarily removed `worker-configuration.d.ts`
and ran `astro check`.

```text
src/actions/index.ts:5:21 - error ts(2307):
Cannot find module 'cloudflare:workers' or its corresponding type declarations.

Result (64 files): 1 error, 0 warnings, 0 hints.
```

Restored the declaration afterward. The regular build generates it first;
setup/check currently does not.

## D1–D3 and conditional live-feed behavior

Read-only archive calculation confirmed:

```text
82 * (47 / 82) = 46.99999999999999
Math.floor(...) = 46
Affected completed 47–35 records: 2004/CHI, 2006/TOR, 2012/GSW
```

For service-dependent paths, `validate-data.mjs` in the scratch control directory
strips TypeScript from the actual source, replaces module/framework imports with
mocks, and invokes the real business logic. The loader's actual installed Zod
schema was retained; no NBA request, Astro HTTP request, Sentry report or real KV
write was made. This is not end-to-end evidence about those external services.

Input: current season `2026`, current date `2026-10-20`, candidate CHA, one NBA-shaped
50–49 CHA/BOS game with `gameStatus: 2`.

```text
Actual loader:
  games: [2026-10-20/BOS-CHA, seasonId 2026, scores 49/50]
  expiresAt: absent

Actual action requested with seasonId 2025:
  mock KV write key: 2025
  written game seasonId: 2026
```

The schema accepts and strips `gameStatus`; completion logic uses the scores.
Whether today's schedule endpoint emits intermediate scores remains unverified.
The season/key mismatch does not depend on those scores being intermediate.

Actual name/history helpers invoked with raw team JSON:

```text
resolveTeamName(Charlotte, "CHA")  -> Charlotte Hornets
resolveTeamName(Charlotte, "2013") -> Charlotte Bobcats

getTeamHistory("BKN"):
  1977–2011 / NJN -> Brooklyn Nets
  2012–present / BKN -> New Jersey Nets
```

Baseline diffs establish that these domain errors predate the sweep. Scratch
output is in `data-validation.txt`.

## Sentry claim adjudication

Read the installed bundler plugin rather than inferring from the workflow:

```js
if (!options.org && !options.authToken.startsWith("sntrys_")) {
  logger.warn("No org provided. Will not upload source maps...");
  return false;
}
```

Therefore missing `SENTRY_ORG` does **not** establish failed uploads for an
organization-token setup. The actual hosted token was not inspected and no
credentialed upload was attempted. The hosted Sentry gate remains necessary.

## What was not validated

- A real hosted Workers preview, binding isolation or production-domain cutover.
- Current live-island execution/KV behavior under an actual played-game payload.
- The NBA endpoint's in-progress/game-eligibility contract.
- Manual screen-reader experience or cross-browser modality behavior.
- New clean Linux installation or partial-staging hk behavior in this round.

Earlier visual/hook approvals remain historical evidence, not new executions by
the independent reviewers. The test relocation passed 21 tests and full verify
before the reviews; those numbers alone do not resolve R2.

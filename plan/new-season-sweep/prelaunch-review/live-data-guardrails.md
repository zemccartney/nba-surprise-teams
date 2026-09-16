# Live data guardrails and preseason diagnostic

**Follow-up:** [live-readability.md](live-readability.md) records the subsequent
review changes. The files below were consolidated into `src/loaders/live/index.ts`
and `utils.ts`; season checks now belong to the loader and unexpected cache
corruption is reported separately from expected version invalidation.
The rest of this document records the initial batch.

## Scope and decisions

Zack approved implementing changes that do not depend on live-game observation:
exclude the Cup championship, retain provider IDs, validate KV/output data,
exercise cache timing with a controlled clock, and add a standalone diagnostic.
The earlier action questions constituted his review feedback; there is no
additional undisclosed action-review gate.

**Unchanged:** preseason action bypass, season-date window, score-based finality,
regular-season archive format, and all static results. No SQLite conversion,
Worker test-runtime migration or deployment. The user-owned `scr.ts` is untouched.

## Code review order

1. `src/loaders/nba-schedule.ts`: plain-Node-safe shared URL/headers and named
   championship prefix. The remaining ID characters are treated as opaque.
2. `src/loaders/live.ts`: filter `006` once before result selection AND the
   earliest-incomplete-game search. Group/quarter/semi games remain eligible.
   Retain the upstream ID as `nbaGameId` without changing the internal `id`.
3. `src/loaders/live-contract.ts`: shared normalized response schema; both loader
   return and persisted data use it. Validated fields include two known teams,
   integer nonnegative scores, dates, IDs and optional integer expiry. Cache
   reads also check the expected season and policy version. Invalid JSON is a
   cache miss, not an exception before the refetch branch.
4. `src/actions/index.ts`: only valid compatible data can be served or used as
   outage fallback. Fresh empty data WITH an expiry is useful before the first
   result and no longer causes unnecessary refetches. Empty undated data remains
   retryable. Expired valid fallback drops expiry rather than inventing a fresh
   HTTP lifetime. Invalid cache plus failed refresh is an explicit error.
5. `src/components/live-cache.ts` and both SSR islands: one shared HTTP freshness
   calculation, flooring seconds and clamping elapsed deadlines to zero rather
   than emitting a negative max-age. No expiry still means no calculated header.
6. `scripts/check-nba-feed.ts` and `MAINTENANCE.md`: direct single-fetch/offline
   analysis, before/during/after preseason instructions and the unresolved
   finality question. No Astro content, KV, polling or deployment in the script.

The existing generic `LoaderResponse` remains available to the independent
archiver. `LiveLoaderResponse` is the stricter live subtype, requiring provider
provenance; this does not force NBA IDs into historical JSON.

## Version change

Loader-owned `LIVE_DATA_VERSION` is now
`07423eeb-1ebb-4cf1-89b7-ab05795b5ac1`, with the previous value and reasons retained
in the adjacent changelog. The old cache is incompatible with the required
provider IDs and new selection policy. It is not eligible as a fallback.

This is rejection on read, NOT a global purge. Existing HTTP responses can
remain cached until their normal expiry. KV entries have no deletion TTL; the
payload's `expiresAt` is only our refresh deadline. Replica propagation is a
separate consistency concern.

No attempt to redesign KV transport-failure behavior or background refresh is
included. This batch validates data boundaries and fallback compatibility.

## Verification

- **103 tests in 12 files pass.** New coverage includes malformed JSON/shapes,
  wrong season/version, absent provider IDs, championship records, valid empty
  fresh cache, undated complete results, exact expiry transition with a new game,
  stale validated outage fallback, and rejecting a wrong-season loader result.
- Actual loader tests preserve IDs, retain group/quarter/semi results, exclude
  final and unfinished championships, retain date filtering, and reject an
  invalid mapped tricode. A status-2/positive-score test deliberately records
  the unchanged finality assumption rather than pretending it is fixed.
- Fake-clock tests cover the 145-minute estimate, five-minute overdue retry,
  countdown, expired HTTP max-age zero and missing-expiry/no-header behavior.
  These are application tests, not claims about real Cloudflare cache behavior.
- Diagnostic tests cover warnings versus failures and execute the real Node CLI
  against isolated snapshots, including refusal to overwrite an existing file.
- Real diagnostic: HTTP 200, JSON served as text/plain, 2026–27, 1,274 games,
  prefixes 001/002/006, all status 1, zero errors/warnings. Offline replay agrees.
  This does not demonstrate live status transitions or score publication timing.
- Changed-file lint passes. The working-tree type check is blocked solely by
  seven errors in the user's evolving `scr.ts`; do not conceal those errors or
  alter/ignore that file as part of this work. Whole-checkout formatting likewise
  encounters the user's scratch experiment.
- Full credential-free `pnpm run build` **passes in a disposable source copy
  excluding only `scr.ts`**, including type/format/lint/zizmor checks and all 103
  tests. It reused installed dependencies; this is not a clean-download or hosted
  Linux claim. No permanent verification exclusions were added.

## Manual use

```sh
mise x -- node scripts/check-nba-feed.ts --season 2026-27 --save /tmp/nba-before.json
mise x -- node scripts/check-nba-feed.ts --season 2026-27 --input /tmp/nba-before.json
```

Use new filenames for during/after snapshots. Successful structural checks do
not prove every working theory. Unexpected status/label/ID patterns are review
warnings, not automatic changes in application policy. `--save` never overwrites.

## Remaining actual-game observations

The current first preseason game is October 3, 2026, Miami at Toronto, 7 p.m.
Eastern. Confirm the schedule before testing. Observe scores and `gameStatus`
before, during and after; then decide whether to change finality. All-zero
preseason snapshots cannot settle that question.

At regular-season activation, inspect actual server-island headers AND results
through a refresh transition. The preseason bypass intentionally has no expiry,
so do not expect opening-game cache headers before that guard stops applying.
The active loader follows candidate-team games, not necessarily the NBA opener.

All changes after checkpoint `1fa273b` remain uncommitted; nothing pushed or
deployed. Hosted availability/replication/HTTP-cache behavior remains a
coordinated operational check.

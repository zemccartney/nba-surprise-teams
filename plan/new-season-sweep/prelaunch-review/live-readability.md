# Live-data review follow-up: ownership, reporting and readability

## Organization

The live implementation now has two files:

- `src/loaders/live/index.ts`: orchestration and the loader-owned version/changelog.
- `src/loaders/live/utils.ts`: upstream/normalized schemas, request details,
  eligibility/date helpers, cache decoding and HTTP freshness calculation.

Removed the separate live-contract, nba-schedule and component live-cache files.
The diagnostic imports only utils and still runs directly in Node, without
Astro content initialization or Worker bindings. To keep this dependency direction
clean, the unchanged team-code schema now lives in utils; `content-utils.ts`
re-exports its existing names. There is no duplicate enum or runtime cycle.

## Season guarantees belong to the loader

Removed the action's post-load scan. The action supplies its requested season ID;
the loader rejects a mismatch with its selected latest season before fetching.
It also verifies the upstream `seasonYear` before assigning local season IDs,
validates slate dates, retains the season date window and validates normalized
output before returning. Input/schema failures throw to the action for reporting.

The action still validates the season of PERSISTED data: old/corrupted KV cannot
be trusted merely because the current loader would not produce that value.

## Expected invalidation versus unexpected corruption

`decodeLiveCache` returns a diagnosis rather than quietly collapsing everything
to undefined. Sentry stays in the action, not in the pure helper:

| Cache state                                            | Behavior                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Missing key                                            | Normal silent fetch                                             |
| Explicit different version                             | Normal silent fetch, before parsing the current data shape      |
| Malformed JSON / missing or malformed version envelope | Report sanitized error, then refetch                            |
| Current-version schema or season failure               | Report sanitized error, then refetch                            |
| Valid fresh/current data                               | Serve                                                           |
| Valid expired data and failed refresh                  | Report refresh failure, serve valid backup without a new expiry |
| No valid backup and failed refresh                     | Report underlying failure, return explicit ActionError          |

Cache reports include the validation boundary/field paths, not cached values or
native JSON-parser excerpts. The action reports the underlying refresh error
once, including when fallback succeeds. Expected request ActionErrors and the
wrapper emitted after a reported refresh failure are not duplicate alerts.

This tests calls into Sentry; actual hosted event delivery remains an operational
check. As before, repeated reads of a genuinely corrupted current value can
produce reports until refresh/replication repairs it. No global purge or automatic
suppression is implied.

## Readability

The diagnostic is organized around named steps: collect readable observations,
inspect identity, inspect timing, inspect status, inspect competition, summarize,
and handle CLI I/O. Explicit blocks and whitespace separate those responsibilities.
The refactored diagnostic's offline report matches the prior report byte-for-byte.

Added the requested comment above `nbaGameId`: the live schema deliberately
expands the historical schema so provider provenance supports championship
validation without rewriting archive data. No finality change was made.

## Vitest guidance

Consulted https://vitest.dev/guide/learn/writing-tests-with-ai.html#common-pitfalls.

- Global `mockReset`, `restoreMocks`, `unstubGlobals` and `unstubEnvs` replace
  repeated local mock cleanup. Explicit fake-timer cleanup remains.
- Application-module mocks use the typed `vi.mock(import(...))` form. Deliberate
  partial Astro/Worker transport shims retain string mocks; they do not pretend
  to implement the entire framework API.
- Shorter behavior names, readable named parameterized cases (not raw JSON in
  test names), and more separation between setup, execution and expectations.
- Tests cover current-version corruption reporting, quiet old-version refresh,
  upstream/requested-season failures, invalid dates, and reporting original
  loader failures exactly once even when a backup serves the request.

## Verification

**110 tests in 12 files pass**, along with the full credential-free build in a
disposable source copy (types, formatting, lint, zizmor, tests and Astro build).
Installed dependencies were reused; this is not a fresh-download or hosted-CI
claim. The standalone Node diagnostic still runs without Astro initialization,
and its offline report is byte-for-byte identical to the pre-refactor report.

Source-copy verification excludes only the user's `scr.ts`, which
remains untouched and independently has type/format errors. No permanent ignore
rule or test exclusion was added for it. No commit, push or deployment.

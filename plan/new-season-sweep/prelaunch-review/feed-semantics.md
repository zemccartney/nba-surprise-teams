# Live feed: successful access and findings for discussion

## Access is unblocked locally

After Zack successfully ran `scr.ts` with `Referer: https://www.nba.com/`, I
repeated that exact script successfully and separately fetched/parsed the
configured schedule URL with HTTP 200. Earlier unsuccessful probes remain
historical evidence, not the current blocker. The change in observed behavior
is not proof of precisely why the earlier requests failed.

Per Zack's direction, the live loader now sends that same Referer alongside
Accept. No endpoint switch, other header experimentation or runtime migration.
A request-level regression test exercises the actual loader with mocked fetch.
Treat this as the practical working solution, without claiming an upstream SLA
or observed hosted success. No finality/eligibility rule changes in this batch.

## Actual response inspected

Local snapshot: `/tmp/nbastt-live-feed-success.json` (not committed).
Provider metadata: `leagueSchedule.seasonYear = 2026-27`,
`meta.time = 2026-09-13T23:02:24.224Z`.

- 174 date slates, 1,274 games.
- Every game has `gameStatus: 1`; all scores are zero. This is a preseason
  schedule, not an observation of in-progress or finished game publication.
- 67 games with ID prefix `001`, labelled Preseason, October 3–16.
- 1,206 games with prefix `002`, October 20–April 11.
- One game with prefix `006`, December 11.
- Our configured season window is October 20–April 11: it excludes these
  preseason games but includes the Cup championship.
- Seven Cup knockout entries currently have unassigned teams/blank tricodes.
  Do not assume the published schedule already contains all 1,230 regular-season
  games or that these placeholder matchups are actionable team games.

## Finding 1: finality is inferred from scores

The current schema retains scores but discards `gameStatus`. `hasScore()` treats
both positive scores as a completed game. That predicate controls BOTH inclusion
in results and identifying the next incomplete game for cache refresh.

The review's controlled fixture supplied a status-2, 50–49 game. The actual
loader accepted it as a result; if there were no other incomplete relevant games,
it returned no expiry. That establishes the code's behavior, **not** that this
schedule endpoint actually publishes partial scores during live games.

Consequences if it does: premature wins/losses, then stale cached results until
another refresh, potentially indefinitely for the last relevant game.

The usual NBA status mapping is 1 scheduled, 2 in progress, 3 final; nba_api's
scoreboard documentation includes status 3 / Final examples. The current live
schedule sample only demonstrates status 1, so we have not directly observed
this endpoint's transition through 2 and 3.

Proposed direction for review: require explicit final status for results and
use the same completion rule for refresh scheduling. Decide how unknown statuses,
postponements or invalid timestamps should remain retryable rather than become
permanent results. Do not implement this without reviewing the desired behavior.

## Finding 2: Cup championship is inside the date window

The response makes the distinction concrete:

| Stage           | Count | ID prefix | gameSubtype        |
| --------------- | ----- | --------- | ------------------ |
| Cup group games | 60    | 002       | in-season          |
| Quarterfinals   | 4     | 002       | in-season-knockout |
| Semifinals      | 2     | 002       | in-season-knockout |
| Championship    | 1     | 006       | in-season-knockout |

Championship entry: `0062600001`, December 11, `gameLabel: Emirates NBA Cup`,
`gameSubLabel: Championship`. Quarterfinal dates are December 4–5 and semifinals
December 8. All seven knockout matchups are currently placeholders.

The NBA Cup championship does not count toward regular-season records; the
other Cup rounds do. Excluding all Cup or all `in-season-knockout` games would
therefore be wrong. The current loader uses only dates, candidate participation
and scores, so a completed championship featuring a candidate would count as an
extra regular-season result. The existing source TODO already acknowledges this
limitation; it is not newly introduced by the Foundations work.

Proposed direction for review: explicitly select regular-season games using a
validated game-ID/type convention, with fixtures proving group/quarter/semi games
remain included and the championship is excluded. ID prefixes and labels in this
snapshot provide concrete evidence, but are not a contractual guarantee against
future upstream changes. This eligibility filter must also apply to refresh
scheduling.

## What changed, and validation limits

Only the Referer request header and its test changed in the loader work. The
prior D2 action-boundary changes remain pending Zack's review; nothing here
revises them. `scr.ts` remains untouched.

70 tests pass, Astro type checking and direct Astro build pass. Full `pnpm run
build` stops at Prettier on the user's unformatted `scr.ts`; no scratch formatting
or ignore-rule changes were made to conceal that. Changed loader/test lint and
format checks are run separately. No commit, push or deployment.

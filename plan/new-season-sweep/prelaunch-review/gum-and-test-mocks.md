# Human-readable feed reports and typed content mocks

The preceding live-data batch was committed as `6fdba39`; its hooks passed 110
tests and restored the user's untracked `scr.ts`. Zack now authorizes incremental
commits as work proceeds. No push or deployment is authorized by that change.

## Feed presentation

The shortest path keeps one script and one analysis pipeline:

```sh
# Default JSON for tools/agents:
mise x -- node scripts/check-nba-feed.ts --season 2026-27

# Same report, rendered as readable Markdown by Gum:
mise x -- node scripts/check-nba-feed.ts --season 2026-27 --pretty

# Replay a previously saved raw response, without fetching:
mise x -- node scripts/check-nba-feed.ts --season 2026-27 --input /tmp/nba-preseason-before.json --pretty
```

No separate shell/jq pipeline or duplicate interpretation logic. Gum is invoked
without a shell, only in pretty mode. Missing Gum produces an actionable error;
rendering/diagnostic failures remain nonzero exits. Snapshots and default JSON
are unchanged. Tables, status samples, errors/warnings, the first preseason game
in Eastern time, and championship entries make the human view easy to scan.

`unassignedMatchups` counts game entries with at least one blank/missing team
tricode. The normal example is a bracket placeholder before teams qualify—not a
missing result. The captured schedule contains seven: four quarterfinals, two
semifinals and the championship. The human view spells this out as “Matchups
awaiting team assignment”; unusual counts still warrant checking the source.

Gum **2.0.0** is pinned in mise with platform lock records. At implementation,
2.0.1 (published September 11) was still inside the existing seven-day release
cooldown, so it was not selected. `mise install --locked` passes. No other tool
versions or supply-chain settings changed.

## Typed mocks

Content-helper and system tests now use `vi.mock(import("astro:content"), ...)`,
as does the action test's content lookup. The shared fixture implements the two
lookup signatures honestly: reference/ID entry lookup and collection filtering,
including predicate typing. Tests cover the reference and filter paths. This
keeps the narrow fixture, not an Astro content-loading emulator.

Only two intentional exceptions remain: `astro:actions` and `cloudflare:workers`
transport/environment shims in the handler tests. Their implementations are
purposefully partial and not structurally equivalent to those entire platform
APIs. Keeping documented string mocks is preferable to suppressing type errors
with broad casts or constructing unused fake framework features.

Global mock reset/restore/unstubbing remains enabled. No framework initialization,
network access or Gum dependency was added to the automated unit tests.

## Verification

- 113 tests in 12 files pass, including pure human-formatting assertions and the
  existing native Node CLI snapshot checks.
- Changed-file lint passes; locked mise installation passes.
- Actual Gum rendering of the real saved NBA response succeeds. A wrong-season
  pretty invocation exits 1 and displays its diagnostic failure.
- Default JSON output remains byte-for-byte identical on the same input.
- Full credential-free build passes in a disposable source copy excluding only
  `scr.ts`, reusing installed dependencies. `scr.ts` is untouched; commit-hook
  staged-file isolation also keeps its experiment out of the checkpoint. No
  permanent verification exclusion was introduced.

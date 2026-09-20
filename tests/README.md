# Tests

Run `mise x -- pnpm test` from the repository root. Vitest tests also run through
normal verify/build commands and the existing test hook. Use `mise run setup`
first to install dependencies, generate Worker types and install hooks.

Following [Vitest's agent guidance](https://vitest.dev/guide/learn/writing-tests-with-ai.html#common-pitfalls),
`vitest.config.ts` resets mock implementations/history, restores spies and
unstubs globals/environment variables before each test. Fake timers still need
explicit `vi.useRealTimers()` cleanup. Prefer short behavior names and typed
`vi.mock(import(...))`; metadata mocks replace plain catalog methods, not a
framework content API. Only the deliberately partial
`astro:actions` transport and `cloudflare:workers` environment shims retain
string mocks rather than hiding incompatible framework types behind casts. Run tests noninteractively (`pnpm test` uses `--run`).

- `system.test.ts`: presentation-specific top-10 cutoff check. `content-fixture.ts`
  restores fresh canonical SQL, runs `validateDataset`, and returns plain records.
  No working DB or Astro store is consulted. Duplicate lifecycle/foreign-key
  assertions are intentionally not maintained as a second validation engine.
- `dataset-validation.test.ts`: targeted edits that SQL accepts but domain rules
  must reject (identity, chronology, cutoffs, game windows, participation/completeness).
- `data-cli.test.ts`: concise failures, opt-in debug stacks, and offline archive
  export/import/dump round-trip.
- `content-fixture.test.ts`: changed-dump freshness and empty/duplicate negative
  controls. Duplicate IDs fail before a Map could hide them.
- `content-utils.test.ts`: projected-win invariants and historical names, with
  plain metadata and an explicitly synthetic 50-game season.
- `database.test.ts`: deterministic restore/dump, safe publication, schema upgrades,
  rollback and optional NBA identifiers.
- `sqlite-store.test.ts`: real staged-index CLI pass/fail/pass, transactional
  edits, SQL constraints, metadata serialization and all approved chart/game
  golden hashes. Future seasons do not change the historical golden.
- `data-editing.test.ts`: metadata writes, explicit add/update semantics and asset
  validation with rollback.
- `nba-archive.test.ts`: paired historical NBA rows, provider identity, incomplete
  or duplicate/conflicting records, legacy tricodes and Cup exclusion.
- `sqlite-boundary.test.ts`: actual Vite dev loads/builds reject direct,
  transitive, dynamic, re-exported and require-based SQL access from SSR.
- `data-audit.test.ts`: final-artifact hashes, missing/unreported files and
  SQL/historical-game leakage negative controls.
- `chart-options.test.ts`: content-independent chart options, descriptions,
  keyboard ordering, active-point styling, and escaped alternatives for all four
  tooltip logo paths (including historical identities).
- `chart-fonts.test.ts`: successful, failed and stalled font readiness, including
  the timeout/timer cleanup.
- `preview-alias.test.ts`: valid, bounded, deterministic and collision-resistant
  branch aliases.
- `svg-optimizer.test.ts`: actual optimizer hooks under an encoded file path.
- `live-action.test.ts`: actual handler with controlled dates and explicit mocks;
  latest-only requests, preseason bypass, validated cache/refetch/fallback,
  expiry transitions and Sentry reporting versus expected version invalidation. `worker-bindings.ts` is a fail-fast Node resolution target,
  not a KV emulator.
- `live-loader.test.ts`: actual loader over controlled NBA responses, request
  headers, provider IDs, Cup exclusion, normalized validation and refresh timing.
  Finality remains score-based pending preseason observations.
- `live-cache.test.ts`: the HTTP freshness calculation shared by both islands.
- `feed-diagnostic.test.ts`: pure feed observations and real offline Node CLI
  checks. No network requests in tests; live diagnostics are manual.
- `dependency-audit.test.ts`: the real pinned pnpm auditor against a loopback
  registry; clean reports pass, all actionable severity levels and registry errors fail.
  No public registry is contacted by these tests. Verification itself does contact it.
- `workflows.test.ts`: installation/pre-commit/deployment audit wiring, the shared TypeScript
  ref classifier and actual Node CLI smoke tests. No shell extraction or
  Windows-specific skip; tests never execute deployment commands.

See [the test/tooling review](../plan/new-season-sweep/prelaunch-review/test-tooling-gates.md)
for the fresh/stale/missing-game and watch-mode negative controls.

Browser regressions remain in the standalone `plan/baseline` module. See its
README for dev/preview commands. `chart-image-labels.mjs` checks real tooltip images,
SVG emoji names, the control's accessible description and resize persistence.
They are not part of Vitest, hooks or CI yet.
Workflow security linting is separate: `mise x -- pnpm run lint:workflows` runs
pinned zizmor offline with strict collection, and is included in verify/build.

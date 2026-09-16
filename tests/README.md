# Tests

Run `mise x -- pnpm test` from the repository root. Vitest tests also run through
normal verify/build commands and the existing test hook. Use `mise run setup`
first to install dependencies, generate Worker types and install hooks.

Following [Vitest's agent guidance](https://vitest.dev/guide/learn/writing-tests-with-ai.html#common-pitfalls),
`vitest.config.ts` resets mock implementations/history, restores spies and
unstubs globals/environment variables before each test. Fake timers still need
explicit `vi.useRealTimers()` cleanup. Prefer short behavior names and typed
`vi.mock(import(...))`; content fixtures use this too, with typed collection
filters and both reference/ID entry lookups. Only the deliberately partial
`astro:actions` transport and `cloudflare:workers` environment shims retain
string mocks rather than hiding incompatible framework types behind casts. Run tests noninteractively (`pnpm test` uses `--run`).

- `system.test.ts`: source-data lifecycle, completeness, referential integrity
  and top-10 cutoff checks. `content-fixture.ts` reads one fresh JSON snapshot
  per run, preserves duplicates, rejects empty arrays and supplies the real
  domain helpers through mocked Astro lookups. No dev server/content store is
  needed; Astro's build still performs content schema validation.
- `content-fixture.test.ts`: isolated-file freshness, empty-input and duplicate
  regressions. Temporary copies are cleaned automatically.
- `content-utils.test.ts`: projected-win invariants and historical names, using
  only seasons/teams JSON plus a synthetic 50-game season. Both data suites
  share `content-api.ts` lookup plumbing, without making unit tests load games.
- `chart-options.test.ts`: content-independent chart options, descriptions,
  keyboard ordering and active-point styling.
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
- `workflows.test.ts`: deployment-time verification wiring, the shared TypeScript
  ref classifier and actual Node CLI smoke tests. No shell extraction or
  Windows-specific skip; tests never execute deployment commands.

See [the test/tooling review](../plan/new-season-sweep/prelaunch-review/test-tooling-gates.md)
for the fresh/stale/missing-game and watch-mode negative controls.

Browser regressions remain in the standalone `plan/baseline` module. See its
README for dev/preview commands. They are not part of Vitest, hooks or CI yet.
Workflow security linting is separate: `mise x -- pnpm run lint:workflows` runs
pinned zizmor offline with strict collection, and is included in verify/build.

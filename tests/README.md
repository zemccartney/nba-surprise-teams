# Tests

Run `mise x -- pnpm test` from the repository root. Vitest tests also run through
normal verify/build commands and the existing test hook. Use `mise run setup`
first to install dependencies, generate Worker types and install hooks.

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
- `workflows.test.ts`: deployment-time verification wiring, the shared TypeScript
  ref classifier and actual Node CLI smoke tests. No shell extraction or
  Windows-specific skip; tests never execute deployment commands.

See [the test/tooling review](../plan/new-season-sweep/prelaunch-review/test-tooling-gates.md)
for the fresh/stale/missing-game and watch-mode negative controls.

Browser regressions remain in the standalone `plan/baseline` module. See its
README for dev/preview commands. They are not part of Vitest, hooks or CI yet.
Workflow security linting is separate: `mise x -- pnpm run lint:workflows` runs
pinned zizmor offline with strict collection, and is included in verify/build.

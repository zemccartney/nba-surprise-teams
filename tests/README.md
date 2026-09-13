# Tests

Run `mise x -- pnpm test` from the repository root. These Vitest tests also run
through the normal verify/build commands and existing test hook.

- `system.test.ts`: content/season validation. Empty **and stale** Astro stores
  can produce false-green results; a passing run proves neither collection
  population nor freshness. Three raw-JSON integrity checks remain independent
  of that gap. See the [validated review](../plan/new-season-sweep/prelaunch-review/README.md)
  for the reproduction and required fix.
- `chart-options.test.ts`: content-independent chart options, point descriptions,
  keyboard ordering and active-point styling.

Browser regression scripts remain in the standalone `plan/baseline` module.
See `plan/baseline/README.md` for running them against dev and built preview;
they are not part of the Vitest command or automated CI yet.

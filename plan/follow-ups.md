# Follow-up work

## Dependency security checks — implemented

`pnpm audit` now checks production, development and optional dependencies:

- After installation through `postinstall`, plus an explicit `mise run setup`
  check because pnpm may skip lifecycle hooks on a no-op install.
- At the start of `pnpm run verify`, therefore before builds and CI deployment.
- On every pre-commit through hk, even without dependency changes.

Findings and registry failures block the check. No advisories are ignored. The
postinstall hook is not a pre-download malware scanner and can be skipped by
`--ignore-scripts`; the independent verification/pre-commit gates remain.
Installation and deployment intentionally recheck: advisory data can change.

The initial baseline was cleared with Sentry 10.27.0 and narrow overrides for
OpenTelemetry core 2.8.0 and Miniflare's sharp 0.35.4. Remove the overrides once
upstream resolves fixed versions itself. See [dependency security operations](../docs/dependency-security.md).

## Constellater

Explore extracting the SQLite snapshot/prerender architecture as a reusable Astro
integration or reference project. See [the design discussion](../docs/constellater.md)
for scope, live-collection tradeoffs, and prerequisites for open-sourcing.

## Astro startup reproduction

The separate dev/check initialization investigation is tracked in
[the status document](new-season-sweep/status.html). Its cause/version boundary
is not proven; do not conflate it with the resolved Ctrl+C output-ordering symptom.

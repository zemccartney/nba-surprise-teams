# Follow-up work

## Monitor first: temporary Astro server-island patch

Track [Astro #18387](https://github.com/withastro/astro/issues/18387) and
[PR #18399](https://github.com/withastro/astro/pull/18399). We currently patch
Astro 7.4.0 to prevent the second distinct server-island page from failing in dev.
This is a real maintenance obligation, not a frictionless dependency upgrade.
Once a published release includes the fix, remove the patch and rerun both
cold-start request orders, the full test suite, and production/preview builds.
See [patch rationale and removal steps](../patches/README.md).

## Cloudflare beta Docker cleanup noise

The Vite plugin lists old project-scoped Docker images during every build, even
without containers. A stopped daemon prints stderr although the failure is
caught and builds succeed. No Docker service is needed here. Recheck upstream
when upgrading the plugin; do not add a second dependency patch just to silence
it. [Trace and context](cf-cli-migration.md#docker-diagnostic).

## Floating navigation — idea

Explore floating/persistent navigation on long pages, especially Archive and
Showdown, to keep the color-mode toggle within easy reach. Preserved from the
retired `10-3-prep.md`; no implementation decision yet.

## Astro / Cloudflare maintenance burden — deferred architecture inquiry

Season launch is complete; no significant refactor now. Resume with a separate
**grilling session**, then a bounded architecture-alternatives investigation
focused on explicit boundaries and low-effort maintenance—not an open-ended CDN
403 chase. The immediate task is only a small local Showdown workaround.

[Owner's full account, concern summary, evidence, and questions to revisit](astro-cloudflare-maintenance-follow-up.md).

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

## Sentry/Astro/Cloudflare upstream reports — TODO

Deferred follow-up, not a Workers cutover blocker: recheck current published
versions. **Highest priority:** premature source-map deletion and incomplete
repeated uploads across build environments, which broke hosted mapping despite
successful uploads. Then file the Node-prerender documentation gap, static-output
middleware registration gap, and declaration packaging bug. No reports filed yet.
[Findings, reproductions, likely repositories and filing checklist](new-season-sweep/findings-sentry-upstream.md)
are linked from the existing Sentry status item. Keep the application pinned
while investigating newer versions in isolated fixtures.

## Manual screen-reader review — deferred

Zack explicitly deferred this review for the Workers cutover (2026-09-26).
Keyboard/focus and automated checks have passed, but do not replace a real
VoiceOver or comparable screen-reader pass. Check reading order, chart/table
alternatives and live loading/error/empty-state announcements. No manual
screen-reader pass is claimed; this is not a cutover blocker after that deferral.

## Constellater

Explore extracting the SQLite snapshot/prerender architecture as a reusable Astro
integration or reference project. See [the design discussion](../docs/constellater.md)
for scope, live-collection tradeoffs, and prerequisites for open-sourcing.

## Astro startup reproduction

The separate dev/check initialization investigation is tracked in
[the status document](new-season-sweep/status.html). Its cause/version boundary
is not proven; do not conflate it with the resolved Ctrl+C output-ordering symptom.

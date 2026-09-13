# R2, R6–R10: reliable content checks and tooling gates

**Follow-up:** [cleanup.md](cleanup.md) supersedes the separate verification
workflow and shell-classifier design below. Zack chose full verification at
preview/production deployment time; the publish gate is temporary. The classifier
is now a shared TypeScript CLI and the data suites share lookup plumbing.
The remainder records the initial batch and its verification.

Zack approved D1/D3 and R3–R5. This batch addresses the remaining code-level
**test/tooling findings**, plus the explicit zizmor request in `scratch.md`.
No post-checkpoint commit, push, binding registration or deployment was made.

## Changes and review order

### 1. R2 — current source data, never an Astro store

Read `tests/content-fixture.ts`, then the diff in `tests/system.test.ts`.

- Each test run reads the four source JSON files directly. A hoisted per-run
  snapshot supplies both the assertions and mocked `astro:content` lookups used
  by the **real** calculation helpers. Watch reruns reload the files too.
- The small test adapter converts the two team-season string references into
  their collection-reference shapes. It is not a replacement Astro loader.
- Arrays retain duplicate IDs for the existing uniqueness assertions; no Map
  silently overwrites duplicates.
- All four arrays must be nonempty. The old empty-games top-10 skip is gone.
- Top-10 validation now filters to archived seasons, matching Stats, and requires
  enough entries to exercise the cutoff.
- Existing lifecycle/record/reference assertions remain in place. Content schema
  validation still belongs to the actual Astro build; these raw-data tests do
  not claim to replace that schema validation.

`tests/content-fixture.test.ts` proves rereading changed data, rejecting each
empty collection and preserving duplicates. The existing Vitest source-change
watch trigger remains important because these reads use filesystem I/O rather
than static JSON imports.

### 2. R6/R7 — safe deployment target and preview alias

Read `.github/workflows/deploy.yml`, `scripts/preview-alias.ts` and their tests.

- Push triggers select branches, not tags. Manual tag dispatch is also excluded
  by the job guard and rejected by the shell classifier.
- Only **case-sensitive `refs/heads/main`** selects production. A branch named
  `Main` selects preview. Shell selection is deliberate: GitHub expression
  string comparisons ignore case.
- Preview aliases contain valid lowercase DNS characters and start with a
  letter. A 12-hex SHA-256 suffix distinguishes refs that normalize/truncate the
  same way. They are deterministic for a branch.
- The length budget uses the **actual generated Worker name** from
  `dist/server/wrangler.json`, not a duplicated hardcoded name. If that name
  leaves insufficient room for a safe alias, the script fails before upload.
- Branch strings enter through an environment variable, not interpolated shell
  source. The CLI prints only the alias.

The workflow tests execute only the actual shell **classifier**, never its
build/upload commands. They also check the ungated verification workflow's
basic wiring. The six shell tests skip on native Windows; they run on macOS and
on the intended Ubuntu CI runner.

### 3. R9 — verification is independent of publishing

`.github/workflows/verify.yml` runs the normal build (types, formatting, lint,
workflow security checks, tests and Astro build) on PRs, branch pushes and manual
dispatches, without Cloudflare/Sentry secrets or a `DEPLOY_ENABLED` condition.
Checkout keeps minimal read permissions and does not persist credentials;
actions remain SHA-pinned and mise installs locked tool versions.

The deploy workflow still performs its own build/verification before publishing.
The separate uninstrumented verification artifact is deliberately not promoted
as the eventual Sentry-enabled hosted artifact.

**No GitHub workflow has been run by this local change:** it is unpushed. The
new workflow still needs its first actual Linux/hosted CI execution.

### 4. R8 — convert the SVG client URL correctly

`svg-optimizer/integration.ts` now uses `fileURLToPath(clientDir)` rather than
`Path.normalize(clientDir.pathname)`.

`tests/svg-optimizer.test.ts` invokes the real integration hooks, writes an SVG
under a temporary path containing spaces, Unicode and `#`, and verifies that
optimization happened and `viewBox` survived. A complete application build also
passed under a checkout directory named **`NBA Tracker`**.

Important limit: a trial with `#` in the **project root** hit Vite's own warned
unsupported-path behavior before our integration ran. The optimizer's URL fix
is not a claim that the whole Vite stack now supports such project roots.

### 5. R10 and zizmor — reproducible developer prerequisites

`mise run setup` now runs:

1. Frozen-lockfile dependency installation.
2. `wrangler types` to create the ignored Worker declarations.
3. hk hook installation.

Zizmor **1.30.0** is an explicit mise tool, pinned in `mise.toml`/`mise.lock`.
The release predates the seven-day tool cooldown; installation verified its
GitHub artifact attestation. Existing Node/pnpm/hk versions and pnpm's
`onFail: "error"` are unchanged. The existing lockfile format was retained.

- `hk.pkl` checks selected workflow YAML via the shared hook steps.
- `pnpm run lint:workflows` checks all workflows and is included in normal
  `check`/`verify`/`build`, including CI.
- Both use `zizmor --offline --strict-collection`: no audit credentials/network
  needed, and malformed workflow input cannot be silently skipped.
- A custom hk check makes those two flags explicit; it does not auto-fix YAML.

## Verification performed

### Actual content-gate negative controls

In a disposable source copy, without starting dev:

| Input/store state                                | Result                               |
| ------------------------------------------------ | ------------------------------------ |
| Valid source, no dev store                       | 10 system tests pass                 |
| Remove `2026-04-12/POR__SAC`                     | Completeness fails: **81 versus 82** |
| Same missing game, add stale store containing it | Still fails: **81 versus 82**        |
| Restore the source game                          | 10 system tests pass                 |

A separate actual Vitest **watch** process in the disposable copy also went
**pass → fail → pass** as that source game was removed/restored, without a dev
server. No application JSON in the working repository was edited.

### Setup, path and hook checks

- Started a disposable Git checkout without generated Worker declarations.
  `mise run setup` produced both declarations and a pre-commit hook.
- Full build under `NBA Tracker` passed, including **59 tests in 8 files**.
- The workflow hook accepts the two real workflows.
- In the disposable checkout, a deliberately unsafe workflow makes the selected
  hk workflow check fail; malformed YAML also fails under strict collection.
  Neither fixture was placed in the working repository or published.
- Current built-preview data-correction and chart-resilience probes passed again;
  the previously approved behavior remains intact.
- Normal local build and locked tool installation passed. Offline zizmor reports
  no findings with its default regular persona; no new suppressions were added.
- Alias CLI smoke: `fix/chart-tooltip` becomes
  `fix-chart-tooltip-5069476e4900` for the generated `nbastt` Worker.

The source copies reused installed dependencies through a symlink. This verifies
fresh **source/setup state**, not a fresh Linux package download. That distinction
and the unexecuted GitHub workflow remain explicit.

## Commands for your review

```sh
mise install --locked
mise run setup
mise x -- pnpm test
mise x -- pnpm run verify
env -u SENTRY_AUTH_TOKEN mise x -- pnpm run build
mise x -- pnpm run lint:workflows
mise x -- hk check --check --step workflows -- .github/workflows/deploy.yml
BRANCH='fix/chart-tooltip' mise x -- node scripts/preview-alias.ts
```

Read the source/tests rather than making malformed-data experiments in this
working checkout. The automatic fixture tests create and clean their own
isolated copies. `git diff` does not show new untracked files; include `git
status` and the new files listed above in review.

## Still open

- R1: actual Workers/KV provisioning, preview write isolation and Pages cutover
  coordination, as previously clarified—not a current production incident.
- D2: the older-season live-action contract, plus authoritative in-progress/final
  and regular-season game eligibility in the live feed. These need their own
  code/fixture pass before live operation.
- Hosted Sentry/source maps, first actual CI run, live-island/cache validation,
  manual screen-reader review, stack integration and deployment/rollback checks.
- The original review reports describe their frozen snapshot; the code findings
  closed locally here are **R2, R6, R7, R8, R9 and R10**. This is not cutover
  approval or a claim that all operational gates are complete.

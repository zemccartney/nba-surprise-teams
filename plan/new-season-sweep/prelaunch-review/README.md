# Pre-launch review: full Foundations stack

## Latest: header-font preload review stop

The [two-font preload experiment](header-font-preloads.md) is on dev 4332 / built 4333. Sampled header geometry shifts disappear across the measured desktop/mobile
navigations, without CSS/font-display or chart-wait changes. Manual review is
still required; no application patch has been promoted.

## Previous persistence/performance review stop

The [SQLite pilot](sqlite-pilot.md) proves the three-context boundary: Node
prerender queries SQLite, build restores the SQL dump, and workerd uses embedded
metadata. Odds/dump workflows, actual staged-blob drift checks, explicit dev refresh
and artifact negative controls pass; 127 tests pass. Root app/live KV are unchanged.
See the [hands-on guide](../../sqlite-spike/README.md); pilot copies use 4329/4330.

A separate **configuration-only** Node-prerender control on 4331 contains no
SQLite code and reduces warm original Stats/team TTFB from 1,404/621ms to 116/5ms.
SQLite is not required for that improvement; its persistence benefits stand
separately. Stop for review before Node-only adoption or a full migration.

## Previous performance review stop

The [frontmatter timing experiment](frontmatter-performance.md) isolates the
server-side stages: Stats frontmatter is 212ms old versus 1,436ms current in dev;
current team path generation repeats twice per request interval. Built prerendering
does not reproduce the large delay. This follows the
[historical React comparison](legacy-react-performance.md). Diagnostic copies
are on 4327/4328; original references remain untouched. Pause for manual review
before the separate font or rendering experiments. Follow-up
[upstream research](astro-dev-performance-research.md) links the runtime transition,
known invalidation bugs, release membership and remaining attribution gaps;
no upgrades or patches have been applied.

## Latest cleanup disposition

See [cleanup.md](cleanup.md): Zack chose deployment-time whole-repository CI,
not a separate always-on workflow. The temporary cutover gate will retire after
migration. This supersedes R9's proposed ungated workflow below. Classifier and
fixture cleanup is local; content testing is at a stopping point.

## Decision

**Keep merge/cutover gated; address the focused findings below first.** The
approved visual design does not need reopening. This review found launch-safety,
interaction and test-validity issues, plus older data bugs that should not be
misrepresented as regressions from the sweep.

Two independent reviewers examined the same frozen candidate without seeing one
another's findings:

- Claude **Fable 5.1** (`claude-fable-5-1`, requested 1M context).
- Codex **GPT-6-Astra** (`gpt-6-astra`, high reasoning).

Their original reports are retained in this directory. **They are inputs, not
our final disposition:** several claims were rejected, qualified or corrected
by independent validation. Read this document and `validation.md` first.

### Scope

Baseline: `f5382f317227bee436f1420cf9c5fbe861b1dbcc` (`main`). Candidate:
`907fd89` plus the complete uncommitted application/tooling/test changes,
including the move into `tests/`. This spans PRs **#9–#16** and `chart-parity`,
not just the last chart patch. `scope.json` records the PR heads and refs.

Each reviewer used a separate Git-backed snapshot. Secrets, build/runtime
state and new generated capture runs were excluded; source, configuration,
planning context, new tests/helpers and Git history were included. Dependencies
were available for read-only inspection. The reviewers did not build/deploy or
edit code. Independent validation used the current local preview and disposable
copies/mocks; no Cloudflare/NBA writes were performed.

## Owner clarification before fixes

Production KV configuration is expected at this stage: actual bindings have not
been registered and the Workers migration has not happened. Treat R1 as migration
provisioning/cutover work, not a current production incident. Settle preview write
isolation during that work rather than conflating it with the existing data bugs.

Zack reproduced D1/D3 and approved their fixes after reviewing the root causes.
Checkpoint: `4c3bc20`. Those fixes are now implemented locally with independent
regressions; see [data-fixes.md](data-fixes.md) for the review/verification guide.
Zack reviewed and approved D1/D3. R3–R5 are now also fixed locally; see
[chart-resilience.md](chart-resilience.md) for the next review and verification
steps. Zack approved that batch too. R2 and R6–R10 are now addressed locally,
including the requested pinned zizmor hook/CI check; see
[test-tooling-gates.md](test-tooling-gates.md) for the evidence and review steps.
These changes are not yet committed or deployed. The findings below describe
the original review snapshot. D2/live-feed work and operational deployment gates
remain open.

## Validated findings — original review snapshot

Severity describes impact; the timing column separates merge readiness from
hosted/live-operation gates. C = Claude; A = Astra.

| ID  | Priority / timing                      | Finding                                                              | Origin / reviewer                                 |
| --- | -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| R1  | P1, before hosted previews             | Preview and production share writable KV configuration               | New Workers workflow; A                           |
| R2  | P1, before trusting merge checks       | Content tests accept empty or stale Astro collections                | Existing test design/current toolchain gap; C + A |
| R3  | P2, before chart merge                 | Font-load failure permanently prevents charts mounting               | React-removal regression; A                       |
| R4  | P2, before chart merge                 | Pointer focus activates an unrelated keyboard-selected dot           | New keyboard interaction; C, browser-confirmed    |
| R5  | P2, before chart merge                 | Escape cannot dismiss a mouse-opened tooltip unless chart is focused | Current accessibility gap; A, browser-confirmed   |
| R6  | P2, before enabling deployment         | A tag named `main` takes the production deployment path              | New workflow; A                                   |
| R7  | P2, before branch previews             | Git branch names are passed through as invalid preview aliases       | New workflow; A                                   |
| R8  | P2, preferably before SVG merge        | URL pathname is incorrectly used as a filesystem path                | New SVGO integration; A                           |
| R9  | P2, before retiring Pages verification | Verification is gated together with publishing                       | Workflow coverage gap; A                          |
| R10 | P3, setup cleanup                      | Fresh setup omits required generated Worker types                    | Tooling setup gap; C, independently confirmed     |

### R1 — Isolate preview storage

`.github/workflows/deploy.yml:35–49`, `wrangler.jsonc:19`,
`src/actions/index.ts:99–106`.

Both workflow paths build the same Worker/binding configuration. Changing
`PUBLIC_DEPLOY_ENV` does not choose a different KV namespace. Replacing the
placeholder with the production namespace therefore also gives preview versions
write access to production season-cache keys. A preview with different candidate
teams or loader behavior could change production results without promoting its
code.

**Validated:** configuration/data-flow inspection. The workflow selects no
separate binding environment, and the action writes through `env.GAMES_KV`.
No hosted contamination experiment was performed; the placeholder/gate currently
prevents an incident.

**Fix:** give previews a separate Worker/environment and KV namespace, selected
consistently during build and upload. Check generated configs, then test storage
isolation using explicitly provisioned test resources before relying on previews.

### R2 — Make content tests validate current inputs

`tests/system.test.ts:24–26, 28–153, 239–315`, `vitest.config.ts`,
`node_modules/astro/dist/content/paths.js` (store selection).

Seven of ten system tests depend on Astro collections that can be empty or stale.
Three raw-JSON integrity tests still do useful work; the entire suite is **not**
vacuous. The new chart-option tests are also independent of this problem.

**Independently reproduced in a disposable copy:**

1. Fresh Vitest run: games/seasons/teamSeasons counts **0/0/0**, all 10 pass.
2. `astro sync` and a successful `astro build` did **not** populate the dev store
   that this Vitest setup reads; another run still passed with zero collections.
3. Start/stop dev: collection counts become **18,607 / 30 / 269**; tests pass.
4. Remove game `2026-04-12/POR__SAC` from the copy's JSON. Tests still pass using
   **18,607 cached games**, although disk now contains 18,606.
5. Refresh the dev store: the existing completeness test correctly fails
   **81 versus 82 games**.

**Fix:** consume freshly loaded raw data for these invariants, or explicitly
refresh the exact store used by Vitest. Assert population **and freshness**.
A nonempty guard alone misses stale data; `astro sync && vitest` alone was not a
working fix in this validation. The test relocation is not the cause.

### R3 — Render when fonts fail

`src/components/charts/echarts.ts:203–211, 226–239`.

`render()` awaits font loads without handling rejection, after the host is
permanently marked mounted and its observer/focus mounting listener removed.

**Browser-confirmed:** aborting font requests leaves all three preview Stats
charts without SVGs, produces three `NetworkError`s, and leaves their focusable
hosts as `role="group"`. Under the same font failure, production still renders
all three Recharts SVGs.

**Fix:** tolerate font errors and initialize with fallback metrics; consider a
bounded wait for stalled loads. Keep this separate from deferred font subsetting.
Add a font-failure browser regression.

### R4 — Separate pointer focus from keyboard selection

`src/components/charts/keyboard.ts:81` (focus handler).

The host handles every focus event as keyboard entry. Clicking/tapping another
point can activate the remembered keyboard point as well.

**Browser-confirmed:** hovering and clicking the 2013–14 Phoenix Suns scatter
point leaves both that point and the initial 2014–15 Philadelphia point outlined.
The tooltip still describes Phoenix; the second outline persists on subsequent
within-point mouse movement.

**Fix:** adopt an explicit modality policy: do not activate stale keyboard
selection merely on pointer focus, or synchronize the selected index with the
clicked point. Preserve keyboard entry/resume. Add click/tap-to-keyboard cases,
not only independent hover and keyboard tests.

### R5 — Escape must dismiss unfocused hover content

`src/components/charts/keyboard.ts:87–135`.

Escape handling is attached only to the chart host. Mouse hover leaves focus
where it was, so the host never receives the key.

**Browser-confirmed:** focus a navigation link, hover Phoenix's scatter point,
then press Escape without moving the mouse. The tooltip remains visible.

**Fix:** allow dismissal of the active hover tooltip independently of chart
focus, without stealing Escape from an already-handled native popover/control.
Test this across chart types. This is a current accessibility defect; baseline
provenance was not established, so it is not labelled a migration regression.

### R6–R7 — Harden deployment ref handling

`.github/workflows/deploy.yml:10–11, 35–49`.

- Unfiltered pushes include tags. `github.ref_name == 'main'` is true for
  **`refs/tags/main`**, not only the production branch. Use branch-filtered
  triggers and an exact production ref, including manual dispatch handling.
- A valid branch such as `fix/chart-tooltip`, `Feature`, or a long name is not
  necessarily a valid Cloudflare preview alias. Generate a bounded, lowercase,
  collision-resistant alias; retain the current safe shell quoting.

**Validated:** workflow condition simulation and the current Cloudflare alias
rules: lowercase letters/numbers/dashes, initial lowercase letter, and at most
63 characters for alias + dash + Worker name. No push/upload was performed.

### R8 — Decode file URLs correctly

`svg-optimizer/integration.ts:52`.

`Path.normalize(clientDir.pathname)` retains percent encoding and mishandles
Windows file URL semantics.

**Actual integration hook reproduced:** a real temporary `NBA Tracker/client/`
directory causes `ENOENT` for `NBA%20Tracker/client/`. `fileURLToPath(clientDir)`
opens the directory correctly.

**Fix:** use Node's `fileURLToPath`. Add a path-with-spaces fixture. This is not
blocking the present Linux checkout path, but is a small, real build regression.

### R9 — Separate CI verification from deployment

`.github/workflows/deploy.yml:19` and the absence of a separate verification job.

`DEPLOY_ENABLED` skips installation and build as well as publishing. Disabling
Pages builds at cutover would leave no ungated repository CI check.

**Fix:** an ungated, credential-free verification/build job for PRs/pushes;
keep publishing gated. Address R2 before treating a green test count as a data
safety guarantee. Browser CI setup can be staged separately, provided explicit
browser runs remain part of premerge verification.

### R10 — Generate Worker types during setup

`mise.toml:26–28`, `hk.pkl` typecheck step, `src/actions/index.ts:5`.

The generated `worker-configuration.d.ts` is ignored, but setup does not generate
it before the hook/check path uses `cloudflare:workers` types.

**Confirmed in the disposable copy:** removing that generated declaration makes
`astro check` fail with TS2307 for `cloudflare:workers`. Normal `pnpm run build`
generates types first, so this is a developer-setup issue, not a broken build.

**Fix:** generate types in the documented setup path, or ensure the check path
establishes this prerequisite.

## Older data issues: separate from migration regressions

| ID  | Priority / timing                          | Finding and validation                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | P2, data correctness follow-up             | `content-utils.ts:276` floors `82 * (47 / 82)` to **46**. Confirmed on raw archive records `2004/CHI`, `2006/TOR`, `2012/GSW`, all actually 47–35. Actual-win surprise classification is unaffected. Multiply integer season length and wins before dividing, retaining zero-games handling; do not replace the intended floor with general rounding.                     |
| D2  | P2, before relying on live action contract | `actions/index.ts:41–106` validates the requested season but calls a latest-season-only loader. Executing the actual action/loader logic with mocked framework/KV/upstream services wrote a **2026** game under KV key **2025**. Reject nonlatest live requests or serve their archive; validate season identity before writing. Current archive pages bypass the action. |
| D3  | P3, safe to separate                       | `stats.astro:140` passes `team.id` instead of `season.id` to the name resolver. Actual resolver returns **Charlotte Hornets** for the 2013 Bobcats entry. `content-utils.ts:363–386` also swaps the Nets history names: Brooklyn for 1977–2011, New Jersey from 2012. Both errors predate the stack and now also appear in spoken descriptions.                           |

### Conditional live-feed risk: validate before games start

`src/loaders/live.ts:35–37, 124–139, 170–199`,
`src/actions/index.ts:80–84`.

The loader treats two positive scores as final. Using the **actual loader and
Zod schema** with a synthetic `gameStatus: 2`, 50–49 fixture returned a completed
result with **no expiration**. Such a result can then be treated as final by KV
caching, or remain until another game's expected finish.

This confirms the code's behavior, **not** that the current NBA schedule endpoint
publishes partial scores. Neither reviewer nor the validation contacted a live
in-progress NBA feed. Before live use, establish completion/regular-season
eligibility from authoritative feed metadata and test in-progress/overtime/final
and final-day cases. Include the existing Cup-final exclusion TODO in that
contract review. This is pre-existing, not a new Workers regression.

## Rejected or qualified reviewer claims

- **“Untracked files are a high-severity defect.”** Rejected as a code finding:
  the user explicitly requested an uncommitted-tree review. Including all new
  helpers/tests in the eventual commit and building a clean checkout is a
  packaging checklist item, not an unexpected bug. The associated hk-stash
  speculation was not verified.
- **“Missing SENTRY_ORG means source maps will not upload.”** Not established.
  The installed Sentry bundler plugin permits missing `org` when the auth token
  starts with `sntrys_`. Its actual guard is
  `!options.org && !options.authToken.startsWith("sntrys_")`. Hosted token/setup
  was not inspected. Preserve the hosted instrumentation/source-map gate; add
  organization configuration if the chosen token requires it.
- **“astro check/sync makes CI tests non-vacuous.”** Corrected by R2's experiments.
  Here, the dev store Vitest uses is distinct from the build store. Neither a
  nonempty guard alone nor simply prepending `astro sync` establishes freshness.
- **“No tests exercise keyboard DOM behavior.”** The standalone browser probes
  already do. The real gap is missing scenarios (R3–R5), manual-only execution,
  and screen-reader/browser breadth—not an absence of DOM testing altogether.
- **SVGO post-hash rewriting:** a real future cache-busting limitation if only
  optimizer settings/version change, but no current incorrect rendering was
  established. Keep as a deferred integration concern, not a launch blocker.
- The unused old preview `site` URL, canvas color fallback edge cases and the
  accepted visual differences are not validated launch defects.

## Operational gates, not code findings

- Keep Pages and Workers cutover coordinated; the GitHub deployment switch does
  not disable the existing Pages Git integration. Commit skip markers are not
  an enduring branch-level safeguard.
- Provision the Worker/isolated KV and establish a safe bootstrap/preview/domain/
  rollback sequence. Do not make the first production-domain deployment merely
  to obtain a preview. The current KV placeholder and disabled publish gate are
  intentional.
- Verify hosted Sentry-enabled output and source maps with browser/island errors.
- Publishing preseason odds permits an island-plumbing/empty-state check, but
  **`actions/index.ts:59` returns early before `season.startDate`**. Full upstream
  fetch/KV behavior needs controlled date/feed fixtures before opening night,
  or validation after that date gate opens.
- Current live-island script execution/caching and manual screen-reader operation
  still need explicit coverage. Source inspection is not a substitute.
- Reconcile docs-only `svg-images` drift `15f967e`; include the complete current
  helpers/tests and validate the eventual committed tree. Existing PR heads do
  not contain the current uncommitted fixes.

## Original suggested next round

1. Fix R1–R9 in focused commits/PR updates; include R10 with tooling setup cleanup.
2. Add the reproduced failure/modality cases and a reliable content-data gate.
3. Decide whether to bundle the small D1/D3 data corrections; resolve D2 and the
   live-feed contract before live-season operation.
4. Rerun clean-install/build, partial-staging hooks, all browser probes and the
   new cases; then review the integrated commit rather than only the working tree.
5. Proceed to hosted validation and coordinated cutover—not an automatic deploy.

Only test organization/documentation was changed in this review round. Findings
have **not** been silently fixed. No commit, push or deployment was performed.

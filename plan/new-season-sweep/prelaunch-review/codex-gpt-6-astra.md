**Keep the Workers cutover gated.** I found defects in chart failure handling and deployment configuration, plus pre-existing live-data problems worth fixing before the upcoming season. The archive itself is complete.

I reviewed this myself. No repository files were changed; I did not install dependencies, run builds/tests against the shared dependency tree, start servers, commit, or deploy.

“Confirmed” below means established from source or a read-only diagnostic. It does not mean reproduced in a hosted browser.

**Confirmed defects, prioritized**

1. **P1 — Preview versions would share production’s writable KV namespace. New deployment defect; fix before hosted previews/cutover.**

   References: [deploy.yml:35](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/.github/workflows/deploy.yml:35), [wrangler.jsonc:17](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/wrangler.jsonc:17), [actions/index.ts:99](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/actions/index.ts:99).

   Both deployment branches build the same Worker configuration. `PUBLIC_DEPLOY_ENV=preview` changes application configuration, but does not select different bindings. Once the placeholder is replaced, visiting a preview can refresh the same season key used by production. A preview with changed candidate teams or loader behavior could therefore change production data without promoting its code. Worker versions capture bindings, but do not isolate storage contents. [Cloudflare version semantics](https://developers.cloudflare.com/workers/versions-and-deployments/).

   **Validation:** compare preview and production generated Worker configurations, especially `GAMES_KV.id`. Then use isolated namespaces and verify that requesting a preview island leaves the production namespace unchanged.

   **Focused fix:** select an explicit preview environment during both build and upload, with a separate KV namespace. No deployment was attempted; the current placeholder still prevents this from being an observed production incident.

2. **P1 — Positive scores are treated as final results, potentially caching an unfinished result until the next game—or indefinitely. Pre-existing; fix before live-season operation.**

   References: [live.ts:35](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/loaders/live.ts:35), [live.ts:124](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/loaders/live.ts:124), [actions/index.ts:80](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/actions/index.ts:80).

   `hasScore()` determines both which games count and which games remain unfinished. A scored in-progress game is counted as a win/loss and excluded from refresh scheduling. If another game is scheduled tomorrow, today’s partial result can survive until tomorrow’s estimated finish. If no scoreless games remain, `expiresAt` disappears and the action treats the cache as final.

   **Verified:** executing the loader control flow with mocked services/schema and an in-progress 50–49 fixture returned that game without an expiration. I did not verify whether today’s CDN feed publishes intermediate scores. The baseline uses the same algorithm.

   **Focused fix:** retain and use authoritative game-status metadata for completion, including refresh scheduling. Validate scoreless, in-progress, overtime, final, and final-day fixtures. Also resolve the existing Cup-final exclusion TODO at `live.ts:121`; date and candidate-team filtering alone cannot establish regular-season eligibility.

3. **P2 — A failed font request permanently prevents chart initialization. React-removal regression; fix before merging the chart changes.**

   References: [echarts.ts:208](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/components/charts/echarts.ts:208), [echarts.ts:235](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/components/charts/echarts.ts:235).

   Rendering awaits both font loads without handling rejection. By then, `hasMounted` is true, the intersection observer is disconnected, and the focus listener is removed. A rejected request leaves an empty chart and, for populated charts, a focusable placeholder that never becomes the promised selector.

   **Verified:** an in-memory probe of the actual render function with a rejected font promise never reached `echarts.init()`. Baseline Recharts rendering had no font-success prerequisite.

   **Reproduction:** in a separate browser validation session, block Iosevka `.woff2` requests before loading `/stats/` and `/2025/CHA/`.

   **Focused fix:** tolerate font-load failure and render with fallback metrics; consider a bounded wait for stalled requests. This is independent of the intentionally deferred font-subsetting work.

4. **P2 — Escape dismissal only works when the chart owns keyboard focus. Confirmed current defect; fix before chart merge.**

   Reference: [keyboard.ts:87](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/components/charts/keyboard.ts:87).

   Hovering a chart does not focus its host. Escape pressed while focus remains elsewhere never reaches this listener, so the hover tooltip cannot be dismissed through the implemented keyboard control. The installed ECharts tooltip implementation supplies mouse handling, not a document-level Escape handler.

   **Verified:** inspected ECharts handling and confirmed the helper registers keyboard handling only on the host. Browser reproduction and the exact baseline’s behavior remain unverified; I am not claiming established regression provenance.

   **Reproduction:** leave focus on a navigation link, hover a point without clicking, then press Escape without moving the pointer. Repeat for all four charts.

   **Focused fix:** handle Escape for the currently visible chart tooltip regardless of chart focus, respecting an already-handled Escape from another control. Existing probes only establish focused-chart dismissal.

5. **P2 — A tag named `main` selects the production deployment step. New workflow defect; fix before enabling deployment.**

   Reference: [deploy.yml:44](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/.github/workflows/deploy.yml:44).

   The unrestricted `push` trigger includes tags, and `github.ref_name` is the short name of either a branch or tag. Thus `refs/tags/main` satisfies the production condition, potentially deploying a commit that never reached the production branch. [GitHub context definitions](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts).

   **Validation:** evaluate the workflow against `refs/heads/main`, `refs/heads/chart-parity`, and `refs/tags/main`; no real push is necessary.

   **Focused fix:** restrict push events to branches and require `github.ref == 'refs/heads/main'` for production, including manually dispatched runs.

6. **P2 — Valid Git branch names can be invalid Cloudflare preview aliases. New workflow defect; fix before relying on branch previews.**

   Reference: [deploy.yml:42](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/.github/workflows/deploy.yml:42).

   Names such as `fix/chart-tooltip`, `Feature`, or sufficiently long branch names are passed unchanged. Cloudflare aliases require lowercase letters, numbers and dashes, an initial letter, and a combined alias/Worker-name length limit. Current stack names happen to fit. [Cloudflare alias restrictions](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/).

   **Validation:** exercise alias generation with those examples, including two names that normalize identically.

   **Focused fix:** generate a bounded, lowercase alias with a collision-resistant suffix. Passing through an environment variable correctly avoids shell interpolation problems, but does not make the alias valid.

7. **P2 — SVGO resolves filesystem paths incorrectly when the checkout path contains encoded characters. New regression; preferably fix before the SVG PR merges.**

   Reference: [svg-optimizer/integration.ts:52](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/svg-optimizer/integration.ts:52).

   `clientDir.pathname` remains URL-encoded. A checkout under `NBA Tracker` produces a pathname containing `NBA%20Tracker`; `Path.normalize()` does not decode it. The unhandled directory read then fails an otherwise successful build. Windows file URLs have additional conversion problems.

   **Verified:** the URL conversion error with a read-only Node diagnostic. Baseline had no custom optimizer performing this conversion.

   **Reproduction:** build a separate checkout under a directory containing a space.

   **Focused fix:** use `fileURLToPath(clientDir)`. This can be deferred if launch builds are guaranteed to use the current Linux path, but the fix is small.

8. **P2 — Projected wins round some exact whole-win results down by one. Pre-existing; safe to separate from foundations, but fix for data correctness.**

   Reference: [content-utils.ts:276](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/content-utils.ts:276).

   `Math.floor(numGames * (wins / gamesPlayed))` introduces a floating-point error before flooring. For 47 wins in 82 games, the intermediate value is `46.99999999999999`.

   **Verified against raw archive:** this affects `2004/CHI`, `2006/TOR`, and `2012/GSW`. Their projected wins and pace are understated by one, including chart data. Actual-record surprise classification uses wins directly and is unaffected. The calculation is unchanged from baseline.

   **Reproduction:** `node -e 'console.log(82 * (47 / 82), Math.floor(82 * (47 / 82)))'`.

   **Focused fix:** multiply the integer season length and wins before dividing, preserving the zero-games guard. Add completed-season invariants and representative partial-season cases.

9. **P2 — Requesting an older season can return and persist latest-season games under the older key. Pre-existing; fix before relying on the public action contract.**

   References: [actions/index.ts:41](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/actions/index.ts:41), [actions/index.ts:96](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/actions/index.ts:96), [live.ts:58](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/loaders/live.ts:58).

   The action validates that the requested season exists, but `LiveLoader()` always loads the latest season. The resulting data is written using the requested season’s key.

   **Verified:** an in-memory action/loader probe requesting `2025` wrote games marked `seasonId: "2026"` under key `"2025"`. Framework HTTP handling, schema validation and KV were mocked. Baseline has the same mismatch.

   **Focused fix:** reject nonlatest seasons before live loading, or return their archive. Validate returned game season IDs before persisting. This does not require introducing login/authentication for public basketball data. Existing archived pages bypass the action, limiting current user-facing exposure.

10. **P3 — Historical team names are wrong in two Stats paths. Pre-existing; defer safely.**

    References: [stats.astro:140](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/pages/stats.astro:140), [content-utils.ts:374](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/src/content-utils.ts:374).

    The season chart passes `team.id` where `resolveTeamName()` expects a season ID, losing historical names such as Charlotte Bobcats. Nets history also assigns Brooklyn’s name to the New Jersey period and vice versa. New keyboard descriptions repeat these existing data errors.

    **Validation:** inspect the 2013 season’s Charlotte entry and the Nets history tooltip/spoken description.

    **Focused fix:** pass `season.id` and swap the two Nets name references. Both defects exist in baseline.

**Test and coverage gaps require separate treatment.**

- **P1 — The content-test safety gate remains ineffective on a fresh or stale store.** [system.test.ts:24](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/tests/system.test.ts:24) reads collections without ensuring synchronization; the top-10 test explicitly returns at line 266 when games are empty. I traced the installed Astro implementation: `getViteConfig()` constructs Vite with synchronization disabled, the virtual store exports an empty map when absent, and missing collections return `[]`. Seven of ten system tests then provide no populated-content validation. Three raw-JSON integrity tests still exercise disk data; the entire suite is not vacuous.

  This is pre-existing and unresolved by the test move. Before relying on it as a merge gate, explicitly populate the store and assert that collection counts/content correspond to raw inputs, or run the lifecycle checks directly from raw JSON. In an isolated checkout, compare `mise x -- pnpm test` before and after `mise x -- pnpm exec astro build`, then deliberately remove an archived game and require validation to fail. A nonempty assertion alone does not detect stale content.

- **P2 — All repository-hosted build verification is behind the deployment switch.** [deploy.yml:19](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/.github/workflows/deploy.yml:19) skips installation and build as well as publishing; there is no separate PR verification workflow. Once Pages builds are disabled, this leaves local checks as the only evidence. Add an ungated, credential-free verification/build job while keeping publishing gated. Validate that it runs with `DEPLOY_ENABLED` unset and fails on a deliberate error.

- **P2 — The 11 chart-option cases do not exercise the shared interaction implementation.** [chart-options.test.ts:49](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/tests/chart-options.test.ts:49) checks options, descriptions and ordering; it does not execute real mounting, focus, tooltip DOM reuse or responsive movement. The four browser probes provide useful additional assertions, but remain manual, Chrome-based checks. Add font-failure and unfocused-hover Escape cases to that coverage. Automated browser execution can follow separately if exact premerge runs remain a required check.

The existing browser recipes should be rerun against both independently installed dev and built-preview environments after fixes:

```sh
node plan/baseline/chart-parity.mjs --base http://localhost:4322
node plan/baseline/stats-parity.mjs --base http://localhost:4322
node plan/baseline/stats-tooltips.mjs --base http://localhost:4322
node plan/baseline/stats-keyboard.mjs --base http://localhost:4322
```

These are proposed validation commands, not commands I ran.

**Plausible concerns remain unverified; they are not additional confirmed regressions.**

- **Live-island initialization and caching need current-snapshot coverage before cutover.** Chart mounting and responsive ordering scan the DOM once. Earlier scratch-island artifacts demonstrate successful responses and script delivery, but predate the current keyboard/order work. Validate delayed island responses on a fresh page, empty preseason data, then a seeded played-game fixture; require chart initialization, correct desktop/mobile reading order and working popovers. Exercise cold/warm KV, expiration, upstream failure with fallback, and failure without fallback. Preseason odds publication activates this scenario before opening night.
- **Manual assistive-technology testing remains necessary.** The four selectors have coherent bounds, descriptions and index mappings; team bars highlight both series, and Tab is not intercepted. Source inspection cannot establish whether slider semantics, long history descriptions, native-popover announcements and breakpoint focus restoration work well in actual screen readers. Validate representative VoiceOver/Safari and NVDA/Firefox or Chrome flows before accessibility sign-off.
- **Sentry-enabled Workers behavior remains a cutover prerequisite.** The `cfContext` migration matches the installed adapter. I found no confirmed Sentry regression, but local builds without the token omit the integration at [astro.config.mjs:60](/private/var/folders/q_/k6rq7q311gq6y36rk2yfhvm80000gn/T/nbastt-launch-audit-9xkps_zk/repo/astro.config.mjs:60). Validate a hosted instrumented build, source-map upload, browser and island errors, environment attribution and duplicate reporting. Missing Sentry settings currently permit an uninstrumented build; enforce their presence in the eventual hosted deployment path.

**The intentional launch gates must stay intact.**

The placeholder KV ID and disabled workflow are prerequisites, not defects to remove during review. However, `DEPLOY_ENABLED` controls only GitHub Actions—it does not disable the existing Pages integration. The later `f38a829` and `907fd89` commits lack the earlier Pages-skip prefix; commit-message skipping is per deployment, not an inherited branch safeguard. [Pages skip behavior](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/).

Before integrating Astro 7 into active `main`, verify Pages production-build controls explicitly and establish the Workers preview/domain/rollback sequence. I did not inspect dashboard state. Do not enable the global deployment switch merely to obtain the first preview.

I also verified that `15f967e` is the outstanding docs-only parent drift from `svg-images`: two documentation files, no runtime changes. Reconcile it during stack integration and include all current untracked helpers/tests. Approval of this working-tree snapshot would not establish that the PR heads contain these fixes.

The selected `2026-09-10` compatibility date correctly permits omitted Node flags under the current documented behavior. [Cloudflare Node compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/). I found no basis to reverse the accepted chart styling, SVG delivery approach, or font-optimization deferral.

**Scope and verification limits**

I examined the cumulative tracked changes from `f5382f317227bee436f1420cf9c5fbe861b1dbcc`, individual foundation commits through `907fd89`, provided PR/ref inventory, working-tree modifications and untracked code/tests. This included application routes, calculations, actions/KV, server islands, charts/popovers, image optimization, Astro/Cloudflare/Sentry integration, deployment, dependencies, mise/hk, and test/probe implementations.

Read-only archive diagnostics established:

- 30 seasons, 35 team records, 269 candidate team-seasons and 18,607 games.
- Every candidate team-season has its expected complete game count.
- No game-ID additions, removals, duplicates or ordering changes.
- Only the documented CLE–DEN score correction differs from baseline; its winner is unchanged.
- The current top-10 cutoff is not tied with the eleventh entry.

The reported 21 passing tests and visual/browser approvals remain supplied historical evidence, not fresh execution by this review. I did not reproduce partial-staging hooks, Linux installation, hosted routing/caching, real upstream feed behavior, or screen-reader operation. Those limitations prevent cutover approval, while the focused defects above can be addressed without reopening the approved visual design.

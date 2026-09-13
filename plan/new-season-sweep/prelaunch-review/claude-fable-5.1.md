I have all the evidence I need. Here is the report.

## Pre-launch review: NBA Surprise Teams Tracker foundation stack

**Scope and method.** I reviewed the cumulative diff from baseline `f5382f3` to `907fd89` plus the uncommitted `chart-parity` tree and every untracked file, round by round through the 22 commits. I read the source directly and cross-checked behaviour against the installed internals of Astro 7.3.1, `@astrojs/cloudflare` 14.3.0, ECharts 6.1.0, `@sentry/astro` 10.22.0, the Cloudflare Vite plugin and miniflare. Nothing was edited, installed, built or executed against the shared dependency tree.

**Bottom line.** No application data calculation regressed. The chart port, native popovers, trailing-slash work, Astro 7 fixes, Workers adapter migration and gates are sound by inspection. Three items must be fixed before merge or cutover, all small. The larger risk is process, not code: the current working tree only builds because untracked files happen to be present.

### Confirmed defects and required fixes

**1. High, blocks merge: load-bearing files are untracked.** `src/components/charts/keyboard.ts`, `src/components/charts/tooltip.ts`, `src/components/responsive-order.ts` and the whole `tests/` directory are untracked, while tracked files import them (`src/components/charts/echarts.ts:35-38`, `src/components/team-stats/ui.astro:68`, `src/pages/stats.astro:365`) and `vitest.config.ts:8` only includes `tests/**`. The root `system.test.ts` deletion is also unstaged. A commit of the modified tracked files alone yields a tree that fails type-check, lint and build in any other checkout, and silently runs zero tests. The pre-commit hook would not catch it: hk's git stash leaves untracked files in the working tree during checks (inferred from `hk.pkl` `stash = "git"`; not verifiable offline). Baseline behaviour: none, this is snapshot state. Fix: stage the four new paths and the deletion in the same commit as the chart edits. Validate from a clean clone:

```sh
git clone --no-local <repo> /tmp/nbastt-clean && cd /tmp/nbastt-clean && git checkout chart-parity
mise install --locked && pnpm install --frozen-lockfile && pnpm run build
```

**2. Medium, cutover prerequisite: Sentry uploads no source maps from the workflow.** `astro.config.mjs:60-68` passes only `authToken` and `project`; `.github/workflows/deploy.yml:21-25` provides no `SENTRY_ORG`. Verified in `@sentry/bundler-plugin-core` 4.9.1 (dist/cjs/index.js:9853): with no org it logs "No org provided. Will not upload source maps" and skips release creation, without failing the build. The hosted Sentry validation gate would then pass on unsymbolicated events. Baseline: same config, but the Pages project likely supplied `SENTRY_ORG` as a dashboard variable, which I cannot verify. Fix: add `org` to `sourceMapsUploadOptions` or a `SENTRY_ORG` repository variable to the workflow env. Validate: build with `SENTRY_AUTH_TOKEN` set and grep the log for "Will not upload".

**3. Medium, test validity: the content tests pass vacuously when run standalone.** `tests/system.test.ts:24-26` loads collections at module top; every assertion sits inside a loop over them. `astro/config` `getViteConfig` creates Vite with `sync: false` (astro/dist/config/index.js:38), so Vitest never populates the store. `astro check` does run sync first (astro/dist/cli/check/index.js:27-28), so `pnpm run verify` and the CI build are non-vacuous. A bare `pnpm test`, the hk `test` step on a fresh clone, or a reordered CI step would pass on empty data. Fix: add `expect(seasons.length).toBeGreaterThan(0)` (and the same for `teamSeasons` and `games`) before the loops, or make the `test` script `astro sync && vitest --run`. Validate on a copy: `rm -rf .astro && pnpm test` currently passes; with the guard it must fail.

### Plausible concerns, not verified in a browser

**4. Mouse and touch focus trigger the keyboard selector.** `src/components/charts/keyboard.ts:81` runs `show()` on any focus. The host has `tabIndex=0`, so a click or tap focuses it and dispatches `highlight` plus `showTip` for the last keyboard-selected point, initially point 1. ECharts keeps programmatic highlights until `downplay`, so on the scatter a purple outline can stick on the first point while the mouse hovers elsewhere, and the tooltip can jump on click. Low to medium UX impact. Fix: skip `show()` unless `host.matches(":focus-visible")`. Validate by extending `plan/baseline/stats-tooltips.mjs`: click a scatter dot, assert exactly one outlined point at the hover coordinates.

**5. Slider semantics are correct but hide the tooltip from assistive tech.** `role="slider"` has presentational children per ARIA, so the SVG and tooltip DOM inside the host are hidden and users get only `aria-valuetext`. That is a coherent design; `aria-description` support varies across screen readers. Arrow mapping (Up/Right forward, Down/Left back), Home/End, Escape and untrapped Tab match the slider pattern. The outstanding manual screen-reader check remains the right gate.

**6. Fresh clone cannot pass pre-commit until something generates types.** `worker-configuration.d.ts` is gitignored, `mise run setup` never runs `wrangler types`, and the hk typecheck step runs `astro check` directly. Low. Fix: add `wrangler types` to the setup task.

**7. Preview deploys need an existing Worker.** `deploy.yml:38` uses `wrangler versions upload`, which fails until a first `wrangler deploy` has created the Worker. Order the cutover as production deploy first, or document it. The stale preview `site` URL at `astro.config.mjs:15` is unused by code and harmless.

**8. SVGO output hash does not cover the optimised bytes.** `svg-optimizer/integration.ts` rewrites files after Rolldown hashing while the adapter writes an immutable `Cache-Control` for `/_astro/*`. A change to the SVGO config alone keeps the filename and returning visitors keep the old file. Deferred; documented in the integration comment already, but the cache interaction is not.

**9. Pre-existing, low:** `src/pages/stats.astro:140` passes `team.id` as the season id to `resolveTeamName`, so the per-season tooltip always shows the current franchise name. Unchanged from baseline. Fix: pass `season.id`.

**10. Theme reader failure mode, low, deferred.** `echarts.ts:95-97` assigns the token to a canvas `fillStyle`; an unparseable value is ignored and the previous colour is read back. All twelve tokens exist in `global.css`, so this only bites browsers without oklch canvas support.

### Intentional gates and what I verified about them

- Deployment stays inert: `deploy.yml:19` gates on `DEPLOY_ENABLED`, and `wrangler.jsonc:18` still carries the placeholder KV id, which makes a premature `wrangler deploy` fail loudly. Nothing defeats these.
- `wrangler deploy` from the repo root will use the generated `dist/server/wrangler.json`: the Vite plugin writes `.wrangler/deploy/config.json` at build (`writeDeployConfig` in plugin dist), and the workflow deploys in the same job as the build. Validate at cutover with `pnpm exec wrangler deploy --dry-run --outdir /tmp/wr`.
- No server island exists today: `seasons.json` has 2026 but `teamSeasons.json` has no 2026 rows. Island URLs gain the trailing slash (astro runtime `server-islands.js`), island scripts execute via `createContextualFragment`, the earlier scratch-island runs loaded the pace chart script inside the island, and the `Cache-Control` header set in the two `ssr.astro` files passes through the adapter untouched. Live caching still needs the odds-day check.
- Sentry on Workers: because output is static, the Sentry integration does not add its Node middleware; only the manual `@sentry/cloudflare` wrapper in `src/middleware.ts` runs. The server init snippet still imports `@sentry/node` into the worker, unchanged from baseline. The compatibility date jump from 2025-03-21 to 2026-09-10 is correct per the current Cloudflare docs and is the reason the hosted validation gate must stay.
- Merging to `main` now would trigger a failing Pages build; the last Pages deployment stays live, but content updates would stop shipping. Keep the stack unmerged until cutover.

### Regression checks that passed by inspection

- Data: `content-utils.ts` changes are `split` limit arguments only; record, pace, projected wins, elimination and shortened-season rules are byte-for-byte the same logic. `stats.astro` is a refactor of identical loops. Scatter bounds reproduce the baseline `roundToFive` logic; tooltip indices agree with `dataIndices` for all four charts.
- Migration: no remaining `locals.runtime`, `astro:schema`, React or `.tsx` references. `actions/index.ts` uses `env` from `cloudflare:workers`; adapter 14 throws on the legacy accessor, so leftovers would have failed loudly.
- Trailing slashes: every internal link, the nav highlight, the archiver endpoints and the island URL carry the slash.
- Astro 7 CSS fixes in `table.astro` and `typography.astro` are correct for the compiler's per-compound scoping. Popover ids are unique per page. `responsive-order.ts` and its fallback preserve focus and open popovers. `tooltip.ts` matches ECharts 6.1.0's DOM content path: the container is cleared and the same element re-appended, so image state is retained.

### Coverage limitations

I could not run the build, tests or browser probes. The walkthrough cites capture runs dated 2026-09-12 to 2026-09-14, but `plan/baseline/runs/` in this snapshot ends at `2026-09-11-svgo`, so those probe results are unverifiable here. The four browser probes are not in CI, `chart-options.test.ts` covers option objects only and nothing exercises `keyboard.ts` in a DOM, no test asserts island script execution or the island cache header, and `dev-smoke.mjs` still counts only `<img>` elements. hk's exact stash semantics could not be read offline.

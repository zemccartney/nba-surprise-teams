# New-season sweep: round log

One entry per verified round. Newest first. Each entry says what changed, what
the baseline comparison showed, and what was decided.

## 2026-09-09 — Step 6: dependency round (tsx out, ncu 23, in-range bumps)

**What changed.** `tsx` is gone: `archive:all` and `archive:latest` run
`node archiver/script.ts` (Node 26 strips the types; the archiver is
erasable-syntax TypeScript, `erasableSyntaxOnly` has been on since Step 3).
npm-check-updates 19 → 23 and concurrently 9 → 10, both ESM-only and Node ≥
22; ncu groups output by default now, so `--format group` left the `deps`
script. In-range bumps: astro 5.14.1 → 5.18.2, @astrojs/cloudflare 12.6.10 →
12.6.13, @astrojs/check 0.9.5 → 0.9.10, wrangler 4.41.0 → 4.129.0 (4.129.1
and 4.130.0 are inside the 3-day release age), both fontsource packages 5.3.0,
and a `pnpm update` pass over the transitive tree. Held back, each with its
reason in the README's new "Held back on purpose" list: prettier (pinned
3.6.2), @sentry/astro and @sentry/cloudflare (10.22), sharp (0.34.4), vite
(6.4.1), TypeScript (5.9). `pnpm-workspace.yaml` allows wrangler's optional
`@cloudflare/workers-types` 5 peer against the 4 the adapter brings. Process
change for the batch: `review-step4.md` became the running `review.md`, one
section per round, Step 5 added from its chat report.

**Found on the way:**

1. `@sentry/astro` ≥ 10.40 decides "Workers, not Pages" by looking for
   `pages_build_output_dir` in the wrangler config. Ours is local-only and has
   none, so 10.73 would have added its `withSentry` wrapper around the SSR
   entry of the Pages build too, next to the manual `wrapRequestHandler`
   middleware. That only shows in a build with the Sentry token and can't be
   checked here; held at 10.22 until the round that changes the adapter.
2. prettier 3.9.6 with prettier-plugin-astro 0.14.1 refills two paragraphs of
   `about.astro` to 83–87 columns (`printWidth` is 80); the same lines were
   within 80 under 3.6.2. prettier-plugin-astro 1.0.0 (a rewrite on the Astro
   7 compiler, published 2026-09-08, inside the release age) is where the
   whitespace handling changes on purpose, so both move together later.
3. Astro 5.18 emits one CSS file where 5.14 emitted two: the shared stylesheet
   (17,312 bytes, 8 fewer) and, on the team pages, nothing else, because the
   4,118-byte team-page stylesheet now minifies to under Vite's 4 KB
   `assetsInlineLimit` and `inlineStylesheets: "auto"` inlines it. Same
   rules, delivered in the HTML: team pages +4,029 bytes of HTML, −4,126 of
   CSS, one request fewer. The CSS minifier also drops a few more spaces:
   inline `<style>` blocks shrink by 12 to 32 bytes per page.
4. On the 269 team pages the pace chart's `<script type="module">` tag moved
   from after the chart's JSON props block to the top of the team-stats
   component. Module scripts are deferred and the chart mounts on an
   IntersectionObserver, so nothing observable changes; noted so the HTML
   diff isn't a surprise.
5. Astro 5.18 changed the suffix it appends to processed image names
   (`bat.CRGm1UJN_Z1Nf8JG.svg` → `…_Z2gt7Q3.svg`; the content hash before the
   underscore is unchanged), so every page's HTML differed until the
   comparison normalized that suffix as well as the JS/CSS hashes. The
   normalizer is now a small Python script (`htmldiff.py` in the session
   scratchpad; classifies each page as identical, whitespace-only, stylesheet
   delivery, script placement, or other) rather than a sed expression.
6. No page on the site carries a server island right now: the 2026 season has
   no team seasons yet, so `/2026` isn't generated and the home page shows the
   countdown. The baseline capture can't exercise islands until the odds land
   (or with a scratch team season; the next round does that).

**Verification.** `pnpm run build` green, 47 s locally. Output vs the
eslint-10 build: 68 of 504 files identical by hash; the rest differ by the
image suffix (5) and the CSS chunking (3); `_routes.json` lists the same
routes in a different order; five `_worker.js` modules changed (astro and
adapter internals); the ECharts chunk is 383 bytes larger (bundler output).
HTML, hashes normalized: 269 team pages differ by the inlined stylesheet and
the moved script tag only, the other 34 pages by whitespace inside their
inline `<style>` blocks only; no page differs in any other way.
Runtime capture `runs/2026-09-09-deps-local` vs
`runs/2026-09-09-eslint-10-local`: 44/44 screenshots pixel-identical; team
pages +4,029 B HTML / −4,126 B CSS, every other page −8 B CSS; popovers and
chart tooltips pass the interaction script; 0 console errors. Archiver dry
run: `node archiver/script.ts 2099` boots the Astro dev server on 4322 and
reports the endpoint's 404 for the unknown season, which is the whole script
path minus the NBA fetch.

## 2026-09-09 — Step 5: ESLint 10, `eslint.config.ts`, vitest 5, import-x

**What changed.** ESLint 9 → 10.10 with every plugin on its current major:
eslint-plugin-astro 3 (parses `.astro` with `@astrojs/compiler-rs`), unicorn
74, perfectionist 5, eslint-plugin-package-json 1, @eslint/json 2, globals 17,
typescript-eslint 8.69; vitest 3 → 5. The config is `eslint.config.ts`, loaded
by Node's type stripping behind ESLint's `unstable_native_nodejs_ts_config`
flag (scripts, `lefthook.yml`, `.vscode/settings.json`); `@eslint/compat` is
gone (`includeIgnoreFile` ships in `eslint/config`), as is the `__dirname`
shim (`import.meta.dirname`). New: eslint-plugin-import-x with the TypeScript
resolver, so an import of a package that isn't in `package.json` is a lint
error (the phantom-dependency failure from Step 3; verified it reports `zod`).
`package.json` is `"private": true`. The `tsx` glob left the lefthook lint job.
Details and versions in `findings-tooling.md`.

**Lint fallout, 111 findings → 0.** Rules turned off, each with its reason in
the config: unicorn `max-nested-calls`, `no-top-level-side-effects`,
`prefer-await`, `prefer-number-coercion`, `prefer-simple-condition-first`;
import-x `no-named-as-default-member`; package-json `require-*` configured
with `ignorePrivate`. Code changes, all behavior-preserving: `--fix` for split
limits, `URL#href`, `CSS.escape` in two selectors, early returns, comment
style, a type-union order; by hand: four boolean renames (`isLatestOnly`,
`isInitial`, `isServer`, `isSameOrigin`), `Object.hasOwn` for two `in` checks
and one `!games[id]` in the archiver, `Iterator#toArray()` for six spreads in
Node-only scripts, two declarations moved past early exits, one loop header
hoisted to a variable, and the stats page's per-team loop deduplicated (the
`if (teamHistory)` branches ended with the same 20 lines; now one loop after
the branch). One inline disable: the archiver's games.json comparator, where
`localeCompare` could reorder the archive. `system.test.ts`: the conditional
`expect` became a filter plus a loop.

**Found on the way:**

1. `--fix` for `single-line-block-comment-style` turns `/* Section */` into a
   three-line block comment, not `//`. Converted the stats page's eight
   section markers to `//` by hand.
2. A plugin's rule options in a config object without `files` fails config
   validation for every other file ("could not find plugin package-json"),
   while `"off"` for the same rule is tolerated. The package.json block now
   carries `files: ["**/package.json"]`.
3. Perl `s|…\|\|…|` with `|` as the delimiter: escaping the delimiter yields
   regex alternation, which matched every line and prefixed the whole archiver
   file. Restored from git and redone with `#` delimiters. Tooling note, not a
   repo one.
4. The round's first Pages build failed in lint: `import-x/no-unresolved` on
   `plan/baseline/*.mjs` for `playwright-core`, `pixelmatch`, and `pngjs`.
   That directory is its own pnpm project, so its `node_modules` exists here
   (installed for the captures) and never on the build image. A lint result
   must not depend on what happens to be installed, so `no-unresolved` is off
   for that directory; the other import-x rules stay quiet on modules they
   can't resolve. Reproduced locally by moving `plan/baseline/node_modules`
   aside before the fix.

**Verification.** `pnpm run build` (the Cloudflare path: verify, then build)
green on Node 26.8.1; lint over the repo takes about 4.5 s. Build output vs the
same tree built before the round (`ea1f789`): 183 of 504 files byte-identical;
the ECharts client chunk and its four wrapper chunks got new hashes (the chart
module changed: `CSS.escape`, an early return, a rename); every HTML page
differs only in the inlined nav-highlight script, which gained the 12
characters of `CSS.escape()` (asset hashes normalized, then compared
character by character; the stats page, whose per-team loop was restructured,
is identical otherwise). Runtime capture `runs/2026-09-09-eslint-10-local` vs
`runs/2026-09-09-react-removal-local`: 44/44 screenshots pixel-identical,
payload +12 bytes per page and +14 bytes of JS on chart pages, popovers and
chart tooltips behave as in Step 4 (including the island-mounted chart), no
console errors. The two lint guards were exercised on purpose: an `<img>`
without `alt` in a scratch `.astro` file is reported by
`astro/jsx-a11y/alt-text`, and `import { z } from "zod"` in a scratch `.ts`
file is reported by `import-x/no-extraneous-dependencies`.

**Pages preview, 2026-09-09.** The first push failed the Pages build in lint
(item 4 above); the second built in under five minutes on Node 26.8.1 with the
flagged `eslint.config.ts`. `eslint-10.nba-surprise-teams.pages.dev` captured
as `runs/2026-09-09-preview-eslint-10` and compared with
`runs/2026-09-09-preview-react-removal`: 44/44 screenshots pixel-identical,
the same +12/+14 byte deltas as locally, CSS hash matching the local build,
script hashes differing because the preview bundles Sentry. Popovers and chart
tooltips pass the interaction script; the only console messages are the
Cloudflare Web Analytics beacon's CORS refusals on the `pages.dev` host.
Reading a failed Pages build without the dashboard: `wrangler pages deployment
list` shows the status per commit, and the log is one API call away
(`deployments/<id>/history/logs`), both with the local wrangler login.

## 2026-09-09 — Step 4: React out, ECharts and a native popover in

**What changed.** The four Recharts charts are now ECharts 6.1 (`echarts/core`
with only the bar, line, and scatter charts, the grid, tooltip, markLine,
visualMap, and aria components, and the SVG renderer registered). Each chart is
an `.astro` wrapper that renders a host `<div>` plus the props as a JSON script
block, and a `<script>` that imports the chart's option builder
(`src/components/charts/*.ts`) and mounts it when the host scrolls into view.
Colors and fonts are read from the design tokens at mount. The Radix popover is
a native `[popover]` element: `popovertarget` buttons open and close it, CSS
anchor positioning hangs it below its trigger (flipping above when there's no
room, sliding sideways to stay in the viewport), and browsers without anchor
positioning get the UA default, centered in the viewport. Zero JavaScript.
Removed: react, react-dom, recharts, @radix-ui/react-popover, @astrojs/react,
@types/react\*, clsx, eslint-plugin-react, eslint-plugin-react-refresh; the
`jsx` tsconfig settings; the `react-dom/server.edge` alias. `.tsx` is gone
from the lint globs. `eslint-plugin-jsx-a11y` stays: eslint-plugin-astro uses it
for `.astro` templates (noted in `findings-tooling.md` for the ESLint round).

**Found on the way:**

1. An open-ended `visualMap` piece (`{ gte: 28 }` with no upper bound) crashes
   ECharts' line view when it builds the area gradient
   (`getVisualGradient` reads a stop that was clipped away). Both pieces are
   bounded to the axis range now.
2. zrender can't parse `oklch()` and throws mid-animation when it tweens a hover
   state. The theme reader paints each color token into a 1px canvas and reads
   back the sRGB bytes as hex. Same pixels for in-gamut colors, and the light
   mode round can re-mount on theme change.
3. Importing an SVG from a client `.ts` module pulls Astro's asset runtime and
   zod into the chunk (66 KB for one emoji). The pace wrapper resolves the URL
   server-side with `getImage` and passes it in the payload.
4. Server islands insert their HTML with `createContextualFragment`, so the
   `<script type="module" src>` a component renders inside an island does run.
   The current-season team page mounts its chart that way; verified.
5. The native popover gives the trigger `aria-expanded` and `aria-details` for
   free (Radix set those by hand). The trigger's accessible name is still just
   "?", as before.
6. Radix portaled the popover content to `<body>`; the native one stays where
   it's authored, usually inside a bold, right- or center-aligned table header,
   and inherited all of that. `.popover-body` now resets `font-weight`,
   `font-style`, and `text-align`. Caught by screenshotting the open state.

**Verification.** Types, lint, format, tests green. `runs/2026-09-09-react-removal-local`
vs `runs/2026-09-07-tooling-pnpm-local`: the 7 pages without charts are
pixel-identical at all four widths, including the season pages whose popovers
changed (closed state renders the same). Chart pages differ in the chart area
only, as expected from a different renderer; reviewed side by side. JS shipped
(uncompressed): season pages 249 KB → 0; team pages 697 → 578 KB; stats
640 → 582 KB. Gzipped the chart pages are a wash (about 200 KB either way:
ECharts' core is 174 KB gzip before the chart types; the visualMap component is
12 KB of that, aria 1 KB). Interaction checks in Chrome: every popover opens
anchored to its trigger, flips above it near the bottom of the viewport, stays
inside a 390px viewport, closes on Escape; chart tooltips render with the
popover styling on all four charts; the island-mounted chart works; no console
errors. Not testable here: Safari and Firefox (anchor positioning shipped in
Safari 26 and Firefox 147; older browsers center the popover).

**Pages preview, 2026-09-09.** `react-removal.nba-surprise-teams.pages.dev`
built on the first push (no React deps to install went unnoticed by the image).
Captured as `runs/2026-09-09-preview-react-removal` and compared with
`runs/2026-09-08-preview-tooling`: same shape as the local comparison, seven
pages pixel-identical, chart pages differ in the chart area; the CSS hash
matches the local build while the script chunk hashes differ because the
preview also bundles Sentry. The interaction script passes against the preview
too. Its only console messages are Cloudflare's Web Analytics beacon being
refused by CORS on the `pages.dev` hostname, which is not ours (the capture
tool blocks third-party requests, which is why it never shows up there).

**Deliberate deviations.** No popover arrow: Radix drew a 5px triangle that sat
inside the popover's 12px glow. Y-axis tick intervals are ECharts' choice on the
scatter (10 instead of 15) and pinned to 5 on the team chart.

## 2026-09-07 — Step 3: pnpm 11, Node 26, lefthook

**What changed.** npm → pnpm 11.26.0, pinned with its integrity hash in
`packageManager`; the lockfile came from `pnpm import`, so every resolved
version is what `package-lock.json` had (set-compared: only `pre-commit`'s
subtree left and `lefthook`'s platform binaries arrived). Node 26 via
`.node-version` and `engines`. `pre-commit` (last published 2017) → lefthook 2,
installed by the `prepare` script, running types/format/lint/tests in parallel
with the two linters scoped to staged files. pnpm settings with comments in
`pnpm-workspace.yaml`. `plan/baseline/` got its own `pnpm-workspace.yaml` so
it's a separate project rather than a workspace member. README gained
Toolchain / Dependencies / Git hooks sections.

**Found on the way:**

1. `npm run build` ran check + test twice: npm runs `prebuild` as a lifecycle
   hook and the `build` script called it again explicitly. Renamed to `verify`,
   called once.
2. `trustPolicy: no-downgrade` compares provenance by publish date. Two
   legitimate backports trip it: `semver@6.3.1` (2023, via eslint-plugin-react)
   and `vite@6.4.1` (2025-10 security backport). Kept the policy with
   `trustPolicyIgnoreAfter` = 1 year and `vite@6.4.1` in `trustPolicyExclude`.
3. `sharp` still has an install script (the research said otherwise); it needs
   an `allowBuilds` entry like esbuild/workerd/@sentry/cli/lefthook. When a
   build is unreviewed, pnpm writes a `set this to true or false` placeholder
   into the workspace file.
4. While `pnpm install` is failing, every `pnpm run`/`pnpm exec` fails too
   (`verifyDepsBeforeRun` re-runs the install first).

**Verification.** `pnpm run verify` green on Node 26.8.1. `astro build` output
vs the same commit built with npm on Node 24: `dist/_astro/` (118 files) and
all static output byte-identical; server chunks differ only in Astro's embedded
module paths (`node_modules/.pnpm/...`) and Rollup export-name ordering. Runtime
capture of both builds served by wrangler (`runs/2026-09-07-main-npm-local` vs
`runs/2026-09-07-tooling-pnpm-local`): identical payloads on all 11 pages, 44/44
screenshots pixel-identical, no console or request errors. One server-side
delta: the pnpm build bundles a second copy of zod into
`_worker.js/_astro-internal_actions.mjs` (7 KB → 136 KB; worker total
6.42 → 6.55 MB). Nothing reaches the client and Astro 7 rechunks all of this,
so it's noted, not chased.

**Addendum, 2026-09-08 — phantom dependencies.** The first `pnpm install` ran on
top of npm's `node_modules`; pnpm moved the direct dependencies aside but left
npm's hoisted transitive packages in place, so three undeclared imports kept
resolving: `vite` (`loadEnv` in `astro.config.mjs`), `zod` in
`src/loaders/live.ts` and `archiver/api.ts`. A clean install the next day broke
`astro dev` and `astro build` ("Cannot find module 'vite'"), which a Cloudflare
build would have hit too. Fixes: `vite` declared as a devDependency at the
version Astro resolves (Astro's documented pnpm requirement for `loadEnv`);
`zod` imported as `astro/zod`; unused `dotenv` removed. The `zod` fix also
removed the duplicate zod copy noted above: the bare import had resolved to
npm's leftover copy. The `prepare` script now skips `lefthook install` outside a
git checkout so `git archive`-based reference builds still install. Verified
with a from-scratch `CI=true pnpm install --frozen-lockfile && pnpm run build`
in a copy of the tree. Lesson: after switching package managers, `rm -rf
node_modules` before the first install.

**Also found, not fixed (pre-existing):** in a fresh checkout the vitest run
passes vacuously. `getCollection` in vitest reads `.astro/data-store.json`, which
only `astro dev` and `astro build` write; `astro check` and `astro sync` populate
`node_modules/.astro/` instead. So `verify` on the Cloudflare build (and the old
`prebuild`) runs the 10 lifecycle tests against empty collections and logs
"The collection … does not exist or is empty". Locally the store exists from dev
runs, which is why it looks fine. Candidate fixes: test after the build, or a
vitest setup step that writes the store to `.astro/`. Sharp also needs a direct
dependency for the same hoisting reason as `vite`: Astro's build-time image
generation imports `sharp` from the output directory.

**Decisions, 2026-09-08 (Zack):** the vacuous-tests gap waits for the sqlite
work, which replaces the content collections it stems from. vitest 5 and
eslint-plugin-import-x go in the ESLint 10 round; tsx removal in the deps round.
Added `pnpm run archive:diff` (`archiver/diff.ts`) after `archive:all` turned up
a one-game score correction (1996-11-10 CLE/DEN, 108–79 → 101–86, confirmed by
Basketball-Reference and ESPN; NBA.com's game header still shows the old line
while its box score sums to the new one). Cloudflare dashboard updated.

**Pages preview, 2026-09-08.** With the dashboard updated (`pnpm run build`,
`NODE_VERSION` removed) the `tooling` branch built and deployed. Its CSS asset
hash matches the local build, so the lockfile was honored. Captured as
`runs/2026-09-08-preview-tooling` and compared with `runs/2026-09-08-preview-tailwind`
(the same code as `main`, captured before the season commit): 10/11 pages
identical in payload and scripts; the home page is now the countdown, which is
the season registration, not tooling. One screenshot (2011/CHA desktop) caught
the pace chart mid-animation on a heavily loaded machine; a re-capture with a
6 s settle is pixel-identical on all four widths.

**Done by hand (Cloudflare Pages dashboard, 2026-09-08):** build command
`pnpm run build`; delete `NODE_VERSION` (or set 26) so `.node-version` applies;
`PNPM_VERSION` can stay unset — the image's pnpm 10 self-selects 11.26.0 from
`packageManager`. The first preview build is the test.

## 2026-09-08 — Step 2: register the 2026-27 season

`seasons.json` gains id `2026`, 2026-10-20 to 2027-04-11 (NBA schedule released
2026-08-13). 43 days before opening night, inside the 90-day rule. Per the
lifecycle in MAINTENANCE.md the home page now shows the countdown; `/2025` is
still reachable directly. Episode fields and team seasons follow when the
surprise-teams episode airs and odds are posted, expected late September.

Also this round: the `tailwind-removal` branch deployed to a Pages preview and
was captured as `runs/2026-09-08-preview-tailwind`; every diff against prod is
data-driven (2025 archived) or the About embed, which captures now block.

## 2026-09-07 — Step 1: finish the Tailwind removal

**Starting point.** The uncommitted March working tree already had Tailwind's
packages and config removed and 27 files converted to scoped CSS with tokens.
Types, lint, format, and build were green. Visually it was not equivalent: every
page was taller and several components had drifted.

**Root causes found by the baseline diff, in order of impact:**

1. Tailwind's `text-*` utilities set `font-size` _and_ `line-height`; the
   migration only set `font-size`, so text fell back to the body's 1.5. Fixed by
   adding paired `--text-*--line-height` tokens and a `line-height` next to all 72
   font-size usages (block-aware script; the one block that already had a
   line-height was skipped).
2. The reset had been swapped for a Josh Comeau-style reset, but the markup
   assumed Tailwind's preflight: headings inherit size/weight, links inherit
   color, lists unstyled, padding zeroed, `border: 0 solid`. Replaced with a
   preflight-derived reset. Also dropped the new reset's own opinions that the
   original never had (`text-wrap: balance` on all headings, `text-wrap: pretty`
   on paragraphs, `-webkit-font-smoothing`).
3. `md:container` includes a 1536px cap (`2xl`); the migration stopped at 1280px.
   Added the breakpoint, and a 1920px viewport to the baseline to catch this class
   of thing.
4. Standings legend cell: `space-y-2` on a `<td>` had become `display: flex` on
   the cell, which breaks the table row. Now `> * + * { margin-top }`.
5. Stats table: `md:w-1/3` on the over/under column had lost its media query.
6. 404 title: `!leading-snug` (1.375) had become 1.25.
7. Chart tooltip logos: `drop-shadow-lg` used Tailwind v3's value; corrected to
   v4.1's.
8. `<Typography class="content-narrow">`: Astro forwards the parent's scope
   attribute through rest props, and Typography didn't spread them, so the
   parent-scoped class never matched. About page rendered full width.
9. Team stats table: the original styled `tbody th` inside the Table component
   via nested selectors that Tailwind's pipeline happened to flatten past Astro's
   scoping. Without Tailwind, the nested rules scope to the wrong file and Astro
   emits `:global()` inside a nested block literally (invalid CSS). Rewrote as
   top-level scoped selectors on our own `tr th` cells, with `:global(thead)`
   for the one element that lives in table.astro. Higher specificity than the
   Table's compact rule, so no source-order dependence.

**Deliberate deviation:** the About page's two `~ Heading ~` dividers were
inconsistent in the original ("Missing Seasons" left-packed, "Shortened Seasons"
centered). Both are centered now. Only visible at 1536px and wider.

**Result:** all 11 pages pixel-identical to the Tailwind build at 390, 768, 1440,
and 1920px. CSS shipped drops from ~38 KB to ~17 KB per page; inlined component
styles add ~8–12 KB of HTML per page; net payload down ~0.5% on content pages and
~27% on pages with no islands. See `plan/baseline/runs/2026-09-07-*`.

**Also in this round:** `plan/baseline/` capture + compare tooling; research
write-ups (`findings-astro-upgrade.md`, `findings-tooling.md`); README "Styling"
section; the two untracked local JSON configs sorted so the pre-commit hook
passes.

**Baseline tooling lessons:** third-party embeds (Apple Podcasts) paint on their
own schedule, so screenshots block cross-origin requests by default; Recharts
animates on mount and ignores reduced-motion, so captures settle 2s after
scrolling; a naive pixel diff flags everything below a vertical shift, so when
heights differ, compare the two screenshots rather than the diff.

# New-season sweep: round log

One entry per verified round. Newest first. Each entry says what changed, what
the baseline comparison showed, and what was decided.

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

**Still to do by hand (Cloudflare Pages dashboard):** build command
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

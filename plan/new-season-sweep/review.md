# Review notes: new-season sweep

One running document for the exhaustive review at the end of the batch (Zack,
2026-09-09: "better to have all things to review in front of me rather than
slow-walking this"). One section per round, newest first. Each section has the
state (branch, commits, preview), the files to read in order, the surprises
and what each means for review, the deliberate deviations, a manual test
checklist, and the comparison artifacts. The full record of every round is in
`log.md`; this file is the checklist. Steps 1 to 3 were reviewed round by
round and have no section here.

**Branch stack, oldest first.** `tooling` → `react-removal` → `eslint-10` →
`deps` → `trailing-slash` → `astro-7`. Each branch is stacked on the previous
one, so merging any of them takes everything below it; merge the top one for
the lot, or bisect by checking out an intermediate branch.

## Step 6: dependency round

**State.** Branch `deps` on `eslint-10`. Preview:
https://deps.nba-surprise-teams.pages.dev. Commits listed at the end of this
section.

### Files to read, in order

1. `package.json`: the `archive:*` scripts (`node`, not `tsx`), the `deps`
   script, and the version lines.
2. `README.md`, "Held back on purpose": five packages the `deps` script will
   keep offering, and what each waits for.
3. `pnpm-workspace.yaml`, the `peerDependencyRules` block: a second allowed
   peer mismatch (wrangler's optional `@cloudflare/workers-types` 5).

### Surprises, and what each one means for review

1. **Team pages inline their own stylesheet now.** Astro 5.18's CSS chunking
   put the 4.1 KB team stylesheet under the 4 KB inline limit. Check: view
   source on `/2024/TOR/`: one `<link rel="stylesheet">` (was two) and a
   `<style>` block of about 4 KB near the top; DevTools shows one CSS
   request.
2. **Sentry 10.40+ treats this repo as Workers**, because the wrangler config
   lacks `pages_build_output_dir`, and would wrap the worker entry on the
   Pages build too. Held at 10.22; nothing to check, but it's the reason the
   Sentry rework can't be separated from the adapter move.
3. **Prettier 3.9 reflows `.astro` paragraphs past 80 columns** with the
   current plugin. Pinned to 3.6.2. If you'd rather take 3.9's output now,
   unpin, `pnpm update prettier`, `pnpm run fmt`, and commit the two
   paragraphs in `about.astro`.
4. **No server island exists on the site until the 2026 odds land**, so the
   baseline captures never exercise the island path. The trailing-slash round
   verifies islands with a scratch team season instead.

### Decisions you may flip

- prettier pinned exact (`3.6.2`) rather than `^3.6.2` with the lockfile held,
  so that a plain `pnpm update` can't move it.
- `--format group` dropped from the `deps` script (ncu 23's default).
- sharp, vite, TypeScript, Sentry left for the Astro 7 round.

### Manual test checklist

- [ ] `node archiver/script.ts 2099`: prints "Processing season 2099...",
      then "Archive request failed: 404 Not Found", and exits (the dev server
      on 4322 stops). No change to `src/content/games.json`.
- [ ] `pnpm run archive:latest` if you want the real path: re-archives the
      2025 season; `pnpm run archive:diff` should report nothing changed.
- [ ] `pnpm run deps`: ncu 23's interactive prompt, grouped; the held-back
      packages appear; quit without selecting anything.
- [ ] `pnpm start`: concurrently 10 colors the `astro`/`ts` prefixes on its
      own; both processes come up.
- [ ] `/2024/TOR/`: one stylesheet request (surprise 1).

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-deps-local` vs
  `runs/2026-09-09-eslint-10-local`: 44/44 pixel-identical; team pages
  +4,029 B HTML / −4,126 B CSS; other pages −8 B CSS.
- Preview run: see the Step 6 entry in `log.md` once the Pages build is
  captured.

## Step 5: ESLint 10, `eslint.config.ts`, vitest 5, import-x

**State.** Branch `eslint-10` on `react-removal`. Commits: `827dbfb` (the
change), `49ed1f1` (lint fix for the Pages build), `c95db39` (preview
capture); `82af91d` and `c95db39` are notes. Preview:
https://eslint-10.nba-surprise-teams.pages.dev.

### Files to read, in order

1. `eslint.config.ts`: the whole config is 130 lines. Every rule that is off
   has its reason beside it.
2. `lefthook.yml` and `.vscode/settings.json`: where the
   `unstable_native_nodejs_ts_config` flag lives besides the `lint` scripts.
3. `src/pages/stats.astro`, the per-team loop: the one non-mechanical code
   change (two branches that ended with the same 20 lines became one loop).
4. `system.test.ts`, "current/upcoming seasons must not have static games
   data": conditional `expect` became a filter plus a loop.

### Decisions you may flip

- Five unicorn rules off (`max-nested-calls`, `no-top-level-side-effects`,
  `prefer-await`, `prefer-number-coercion`, `prefer-simple-condition-first`).
- `eslint-plugin-jsx-a11y` kept for `.astro` templates although it is
  unmaintained and its peer range stops at ESLint 9 (allowed in
  `pnpm-workspace.yaml`).
- `"private": true` in `package.json` rather than turning off the
  `package-json/require-*` rules.
- `.vscode/settings.json` `eslint.probe` lists json, jsonc, and astro.
- Four boolean renames (`isLatestOnly`, `isInitial`, `isServer`,
  `isSameOrigin`) from `unicorn/no-unused-properties`-style rules.

### Manual test checklist

- [ ] VS Code: open a `.ts` file, add an unused variable; the ESLint extension
      reports it (proves the flag reaches the extension).
- [ ] `pnpm run lint` finishes in about 5 s with no findings.
- [ ] `pnpm run lint:debug src/pages/stats.astro` prints the resolved config
      for an `.astro` file (jsx-a11y rules present).
- [ ] Commit something trivial; the pre-commit hook runs in about 5 to 6 s.
      Zack flagged hook timing as an item to look at; this is the number to
      compare against.

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-eslint-10-local` vs
  `runs/2026-09-09-react-removal-local`: 44/44 pixel-identical, +12 bytes of
  HTML per page (`CSS.escape()` in the nav script).
- `runs/2026-09-09-preview-eslint-10` vs `runs/2026-09-09-preview-react-removal`:
  same result against the deployed previews.

## Step 4: React out, ECharts and a native popover in

For Zack's manual review. Written 2026-09-09 from the round report. The full
record of the round is the Step 4 entry in `log.md`; this file is the checklist.

**State.** Branch `react-removal`, stacked on the unmerged `tooling` branch.
Commits: `d38f389` (the change), `583fba7` (preview capture), `ea1f789`
(`@types/node`). Preview: https://react-removal.nba-surprise-teams.pages.dev.

### Files to read, in order

1. `src/components/charts/echarts.ts`: ECharts registration, the theme reader
   (design tokens to hex), and the mount loop (IntersectionObserver, fonts,
   reduced motion, resize). Everything else builds on it.
2. `src/components/charts/team-season-pace.ts` and its `.astro` wrapper. The
   wrapper shows the JSON handoff (props serialized into a script block, read
   back at mount). The builder shows the visualMap split fill that replaced the
   gradient offset math.
3. `src/components/popover.astro` and `src/components/popover.css`. The whole
   popover is markup plus the `@supports (position-area: block-end)` block.

### Surprises, and what each one means for review

1. **Open-ended visualMap pieces crash ECharts' line view** while it builds
   the area gradient. Both pieces on the pace chart are bounded to the axis
   range. Check: the pace chart's fill is green above the threshold line and
   red below it, and the line itself stays lime.
2. **zrender can't parse `oklch()`**; it throws mid-animation when it tweens a
   hover state. The theme reader paints each token into a 1px canvas and reads
   the sRGB bytes back as hex. Check: chart colors against the same tokens
   elsewhere on the page. If a color looks off on a wide-gamut (P3) display,
   this conversion clips to sRGB and is the first suspect. Headless captures
   are sRGB and would not show it.
3. **Importing an SVG from a client module** dragged Astro's asset runtime and
   zod into the chunk (66 KB for one emoji). The pace wrapper resolves the URL
   server-side with `getImage` and passes it in. Check: the hushed-face emoji
   renders next to the threshold label on the pace chart.
4. **Server islands run module scripts.** The current-season team page mounts
   its chart inside the island. Check: `/2025/CHA` (or any current-season team)
   renders the pace chart after the island loads.
5. **Native popover gives the trigger `aria-expanded` and `aria-details`**
   for free. The trigger's accessible name is still just "?", as before.
6. **The popover inherited table-header styles.** Radix portaled to `<body>`;
   the native one stays inside the `<th>` and picked up bold, italic, and the
   header's text alignment. `.popover-body` resets `font-weight`,
   `font-style`, and `text-align`. Check: every popover's text is regular
   weight and left-aligned, including the episode popover on season pages.

**Deliberate deviations.** No popover arrow (Radix's 5px triangle sat inside
the 12px glow). Y-axis tick intervals: ECharts' choice on the scatter (10, was
15), pinned to 5 on the surprises-by-team chart.

**Sizes.** Uncompressed JS per page: season pages 249 KB to 0; team pages 697
to 578 KB; stats 640 to 583 KB. Gzipped, the chart pages are a wash at about
200 KB either way; ECharts' core with only the line chart is 174 KB gzip, so
that is the floor with this library.

**Lint.** `eslint-plugin-jsx-a11y` stays: eslint-plugin-astro's
`jsx-a11y-strict` config lints `.astro` templates with it, and the ESLint 10
round (Step 5) confirmed it runs on ESLint 10.

### Manual test checklist

Run `pnpm start`, or use the preview URL.

- [ ] `/stats`: hover each of the three charts; tooltip content matches the old
      build (team logos in the per-season tooltip, history list in the
      per-team tooltip, over/under and pace on the scatter).
- [ ] `/stats`: open the top-10 pace popover; click outside; reopen; Escape.
- [ ] `/2011/CHA`: hover the pace chart near the threshold crossing; the fill
      changes color at the line; the emoji label sits at the left end.
- [ ] `/2011/CHA`: open all four question-mark popovers (shortened season,
      record needed, pace, have-to-go); each hangs below its trigger, or flips
      above it near the bottom of the viewport.
- [ ] `/2025/CHA`: island-mounted chart renders.
- [ ] `/2024`: episode popover opens and its text is regular weight.
- [ ] Phone width (390px): open the shortened-season popover; it stays inside
      the viewport.
- [ ] Reduced motion on: charts render without the mount animation.
- [ ] **Safari and Firefox** (not testable here; only Chrome was available):
      popover placement. Anchor positioning shipped in Safari 26 and Firefox
      147; older versions center the popover in the viewport, which is the
      intended fallback.
- [ ] Keyboard: Tab to a "?" trigger, Enter opens, Escape closes, focus returns
      to the trigger.

### Comparison artifacts

- `plan/baseline/runs/2026-09-09-react-removal-local` vs
  `runs/2026-09-07-tooling-pnpm-local`: 7 pages pixel-identical at 390, 768,
  1440, 1920; chart pages differ only inside the chart area.
- `runs/2026-09-09-preview-react-removal` vs `runs/2026-09-08-preview-tooling`:
  same shape against the deployed previews.
- Re-run: `node plan/baseline/compare.mjs <runA> <runB>` (usage in
  `plan/baseline/README.md`).

### Issues found in review

- 2026-09-09, Zack: "some layout and coloring issues", details to follow.
  Where to look first: `src/components/charts/charts.css` (`.chart` is a
  fixed 600px tall; Recharts sized from its ResponsiveContainer), the theme
  reader in `echarts.ts` (hex conversion, surprise 2 above), and
  `popover.css` (`width: fit-content; max-width: 20rem`).

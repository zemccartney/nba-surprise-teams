# Step 4 review notes: React out, ECharts + native popover in

For Zack's manual review. Written 2026-09-09 from the round report. The full
record of the round is the Step 4 entry in `log.md`; this file is the checklist.

**State.** Branch `react-removal`, stacked on the unmerged `tooling` branch.
Commits: `d38f389` (the change), `583fba7` (preview capture), `ea1f789`
(`@types/node`). Preview: https://react-removal.nba-surprise-teams.pages.dev.
Merge order: `tooling` then `react-removal`, or just `react-removal`, which
contains it.

## Files to read, in order

1. `src/components/charts/echarts.ts`: ECharts registration, the theme reader
   (design tokens to hex), and the mount loop (IntersectionObserver, fonts,
   reduced motion, resize). Everything else builds on it.
2. `src/components/charts/team-season-pace.ts` and its `.astro` wrapper. The
   wrapper shows the JSON handoff (props serialized into a script block, read
   back at mount). The builder shows the visualMap split fill that replaced the
   gradient offset math.
3. `src/components/popover.astro` and `src/components/popover.css`. The whole
   popover is markup plus the `@supports (position-area: block-end)` block.

## Surprises, and what each one means for review

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

## Manual test checklist

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

## Comparison artifacts

- `plan/baseline/runs/2026-09-09-react-removal-local` vs
  `runs/2026-09-07-tooling-pnpm-local`: 7 pages pixel-identical at 390, 768,
  1440, 1920; chart pages differ only inside the chart area.
- `runs/2026-09-09-preview-react-removal` vs `runs/2026-09-08-preview-tooling`:
  same shape against the deployed previews.
- Re-run: `node plan/baseline/compare.mjs <runA> <runB>` (usage in
  `plan/baseline/README.md`).

## Issues found in review

- 2026-09-09, Zack: "some layout and coloring issues", details to follow.
  Where to look first: `src/components/charts/charts.css` (`.chart` is a
  fixed 600px tall; Recharts sized from its ResponsiveContainer), the theme
  reader in `echarts.ts` (hex conversion, surprise 2 above), and
  `popover.css` (`width: fit-content; max-width: 20rem`).

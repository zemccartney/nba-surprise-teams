# Light mode — incremental implementation and review

## Isolation and source

- Branch: `feature/light-mode`, worktree: `../nba-surprise-teams-light-mode`.
- Base: `626171e`; main was advancing while this worktree was created.
- Historical design: `origin/light-mode`. Preserve that ref; port intent rather
  than rebasing obsolete React/Tailwind code over the current app.
- Do not touch Showdown, image-service, production, or Cloudflare resources.
- Local dev: http://localhost:4341/ (only while the checkpoint server runs).
- Built workerd preview: http://localhost:4344/ (no dev toolbar).

## Current tour — checkpoint 2

Zack asked to finish surface coverage before collecting styling notes. No merge
or deployment is authorized; this checkpoint is ready for that design review.

1. [Team + pace chart](http://localhost:4344/2025/CHA/): toggle themes, hover the
   chart, use Tab/arrows/Home/End, open the table's question-mark popovers.
2. [All three Stats charts](http://localhost:4344/stats/): alternating seasonal
   bars, positive/negative team bars, scatter selections and tooltips.
3. [Shortened season](http://localhost:4344/2011/): season buttons, notice text,
   table stripes and popovers. Also [archive](http://localhost:4344/archive/).
4. [About](http://localhost:4344/about/) and [404](http://localhost:4344/404/).
5. Try 320px/390px widths, reload and open another tab to check persistence.

The same paths work on dev port 4341. Local storage is origin-specific: dev and
preview choices do not synchronize with one another, but tabs on the same port do.

## Glowing skull eyes, quieter navigation toggle, and sticky header edge

Latest requests are implemented together:

- Only the two skull eyes glow in light mode, using the same `--bulb-light`
  pale yellow as the switch. The slate head/bones remain and the nose stays
  dark. The skull now renders inline from the same SVG source so those parts
  can be painted separately; the right eye and nose were separated into paths
  without changing geometry. `role="img"` and the previous accessible description
  replace the external image's `alt`. Other emoji remain normal images.
- The bulb sits immediately after About, vertically centered with the nav links
  on home and subpages. Artwork is 24px with a restrained glow; the hit target
  remains 44×44px. Narrow-header padding lets the row fit at 320px. The separate
  centered bulb row is gone. This layout refinement applies in both themes.
- Light sticky header cells carry their own inset 2px bottom edge, rather than
  relying on collapsed borders that remain in the scrolling table layer.
  Normal cell borders are retained; dark headers remain borderless.

Review [2011 standings](http://localhost:4344/2011/): inspect the eyes, then
scroll the table until its header sticks. Also check [home navigation](http://localhost:4344/)
and [Portland's larger skull](http://localhost:4344/2025/POR/).

Verification: check/build and 220 tests pass. Both dev and built preview pass
54 page/theme/width cases, with explicit eye-color/glow/nose/accessible-name
checks, nav alignment and hit-target checks, and actual screenshot pixels proving
the bottom edge survives scrolling at 1440/390/320px. Header popovers still work
while stuck. Dark inline skull renders have **zero pixel differences** against
the original image at 18/20/32px. Dev smoke reports 32 external images and zero
problems; 15 skull image instances are now inline SVGs, covered by the new checks.

Artifacts: `/tmp/nbastt-nav-skull/` (dev/preview pages and sticky-header captures)
and `/tmp/nbastt-skull-eyes/` (eye review and dark glyph comparisons). Astro dev
retained the old SVG module during the initial asset edit; a server restart was
required, after which dev and built preview rendered the same updated paths.
No production deployment or merge.

## Eliminated emoji — stronger light-mode contrast (prior checkpoint)

The skull's pale gray silhouette was getting lost against both lavender table
backgrounds. In light mode only, `brightness(0.5) contrast(1.5)` deepens the
existing SVG to slate skull/bones with black eye sockets. Sampled solid pixels
are approximately `#596065` (skull) and `#3f4a51` (bones). No halo, badge, asset
fork, size change, or altered alternative text. Other result emoji and dark
mode retain their original appearance. The shared component covers standings,
legends, team status and have-to-go cells, including server-island output.

Review [2011 standings](http://localhost:4344/2011/) at mobile or desktop size,
and the [eliminated Portland team](http://localhost:4344/2025/POR/). The theme
switch repaints the existing image without changing its source or dimensions.

Check/build and 220 tests pass. The browser matrix now includes an eliminated
team page: 54 page/theme/width combinations pass in dev and built preview, with
assertions that only eliminated emoji get the treatment and only in light mode.
Dev smoke: 47 images, no problems. Screenshots and before/after crops:
`/tmp/nbastt-light-skull/`. No production deployment.

## Season bars — link purple and table-stripe purple

Latest request supersedes the green seasonal-bar experiment: in light mode,
`--chart-season` aliases `--ink-link`, and `--chart-alternate` aliases
`--surface-row`. Other chart colors and dark mode are unchanged. A dedicated
season token keeps this choice independent of positive green elsewhere.

Check/build and 220 tests pass. All four light-chart interaction checks pass in
dev and built preview at three widths. Browser checks verify rendered bar fills
match the actual link/stripe tokens and toggle back to the original dark green.
SVG unit coverage checks both seasonal paints. Artifacts: `/tmp/nbastt-light-purple/`.
The exact table-stripe shade is another explicitly recorded below-3:1 contrast
exception against the pale plot; the requested shade is preserved for review.

Review [Stats](http://localhost:4344/stats/).

## Chart palette experiment — lighter bases, former bases as contrast

Latest feedback: lighten both base chart colors and try the previous base shades
for contrasting tones. Light mode now uses green `oklch(61% 0.13 150)` and red
`oklch(64% 0.18 27.5)`. Pace strokes and hover/keyboard dots use the prior green
`oklch(45% 0.12 150)` and red `oklch(48% 0.18 27.5)`, replacing the almost-black
strokes. Seasonal bars alternate between the new base green and old base green.
Scatter uses the new base shades; its green is the same lighter green as the
previous feedback round. Gold accents, the pale plotting surface, and dark mode
are unchanged.

The opaque bases retain 3.11:1 (green) and 3.15:1 (red) against the plot. No
additional contrast exceptions were introduced; the existing gold exception
remains. Check/build and 220 tests pass. Dev and built preview pass the 48-page
matrix and all four light-chart interaction checks at three widths. Explicit
positive and negative pace selection checks confirm the old base shades are
used by the focused dots. Evidence: `/tmp/nbastt-light-palette/`, including
`positive-focus.png` and `negative-focus.png`.

Compare [the pace chart](http://localhost:4344/2025/CHA/) and
[Stats](http://localhost:4344/stats/). This is a color experiment awaiting Zack's
feedback, not an approved final palette.

## Styling feedback round — implemented, ready for another look

Zack requested these light-only refinements:

- Actual collapsed 2px borders on every table cell, including body cells and
  nested popover tables; replace the prior perimeter/header-only outlines.
- Remove Detroit's turquoise contrast halo in light mode. The exact original
  drop shadows remain in dark mode via `--detroit-logo-filter`.
- Reuse dark mode's `--color-yellow-400` warm accent for the team-results zero
  line and the scatter's focused-dot ring. Purple popover borders are unchanged.
- Give surprise scatter dots their own semantic token, using the lighter green
  from the alternating bars; do not also brighten the pace chart's strokes.
- Replace muddy notice/warning ink with saturated orange, `oklch(48.5% 0.17 45)`.
  It remains above 4.5:1 against the lavender page.

Contrast tradeoff: the exact requested gold is only **1.36:1** against the pale
plot. Its zero line and focus ring are explicit visual-review exceptions, not
3:1 passes. The browser harness records these ratios and checks exact shade
fidelity; normal text and data-mark contrast requirements remain enforced.

The [2011 season](http://localhost:4344/2011/) shows the borders, Detroit logo
and orange notice together. [Stats](http://localhost:4344/stats/) shows the gold
zero line and lighter dots; use keyboard or pointer selection to see the ring.

Verification: check/build and 220 tests pass; 48 page/theme/width combinations
pass in dev and built preview, now including every light table cell border and
Detroit's theme-specific filter. Light chart interaction matrices also pass in
both runtimes. Artifacts: `/tmp/nbastt-light-feedback/`, including
`focused-scatter.png`. No merge or deployment.

## Checkpoint 1 — palette and bulb (historical)

Recovered the actual WIP palette: indigo-200 ground, indigo-300 stripes,
slate-950 text/outlines, indigo-700 links. The unused light-emerald token was
not the background used by the old layout.

Pixel-art bulb: outline when dark, pale filled center when light, radial glow
behind the silhouette rather than a rectangular SVG box shadow. Stable accessible
name “Light mode”, pressed state, keyboard focus, 48px hit target. Temporary
placement below the header navigation keeps narrow screens uncluttered.

System preference initializes before body paint; explicit choice uses the old
`theme` storage key. Blocked storage falls back to in-memory switching. System
changes are followed until a choice is made; storage events synchronize tabs.
No JavaScript leaves the existing dark theme and hides the unusable button.

Tour:

1. http://localhost:4341/2025/ — toggle, examine stripes, outlines, glow.
2. http://localhost:4341/archive/ — denser tables and header consistency.
3. Reload, navigate between pages, try Tab then Space/Enter, resize to mobile.
4. Return to dark and check the familiar appearance.

At this first checkpoint, a temporary light-only palette bridge reused legacy
color tokens. Chart/popover/state coverage was pending; checkpoint 2 replaces
that bridge. The feature still awaits Zack's design approval.

Decisions Zack may flip: lavender palette fidelity, glow size/strength, filled
versus outlined lit bulb, below-nav versus inline placement, system-first default.

## Checkpoint 2 — semantic paints and full surface coverage

Implemented role-based tokens for page/text/link/table/border/tooltip/chart
paints; palette primitives no longer change meaning. All four charts now have
separate axes, grids, alternate bars, positive/negative fills and lines, focus
highlights, hover bands and zero-line paints. SVG CSS references repaint in place
on toggle, including a currently open tooltip, without remounting the chart.

Light popovers use an almost-white lavender surface, dark ink, purple outline
and restrained shadow rather than the dark theme's purple glow. Season buttons,
shortened-season notices, loading/errors and 404 use semantic paints too. Team
and emoji SVGs are unchanged. Dark role values retain the accepted colors.

Decisions Zack may flip:

- Keep the pale chart plotting surface versus making it match the page.
- Keep the green/red data encoding with darker strokes in light mode.
- Keep the light popover outline/shadow rather than a glow.
- Bulb placement, icon and glow are still the checkpoint-1 design.
- Indigo links are slightly deeper than the original WIP: its 4.03:1 contrast
  on striped rows missed 4.5:1. Hover/active colors remain darker, not paler.

A 320px standings header overflow was discovered during the matrix. Below 360px,
team/O-U columns now take 48%/30%, leaving enough room for Pace. This intentional
layout correction applies in both themes; larger layouts are unchanged.
Showdown is not in this base and remains another agent's responsibility.

## Checkpoint 3 — verification and merge readiness

- Automated preference resolution/persistence, denied storage, invalid values,
  cross-tab reset, system updates and keyboard assertions.
- Dev and built preview screenshots: dark/light, 1440/390/320 widths, home,
  historical season, team, archive, stats, about, 404 and popovers.
- Dark screenshot comparisons against the isolated base; inspect chart interiors.
- Check first paint on reload; no theme transition animation/flashing.
- Run types, formatting, lint, tests, build and required dev smoke.
- Ask for final manual tour approval before merge or deployment.

## Checkpoint 2 evidence

- `pnpm run check`, 220 tests, and the full `pnpm run build` pass.
- Dev smoke: 47 images, none broken, zero reported problems.
- `plan/baseline/light-mode.mjs`: 48 page/theme/width combinations, popovers,
  light-palette contrast checks (4.5:1 text, 3:1 data marks), live SVG and open
  tooltip repaint, reload persistence, keyboard toggle, cross-tab synchronization
  and denied theme storage. This is targeted contrast coverage, not a claim of
  full accessibility certification.
- `plan/baseline/tanstack-application.mjs` now takes optional `dark|light` and
  checks semantic paints. Both themes, all four charts, 1440/390/320px pass in
  dev and built workerd preview, including focus, bounds, resize and token edits.
- Loading/error components rendered in a temporary dev route at all three
  widths in both themes; six screenshots checked. The fixture was removed;
  no review route ships and no canonical data was modified.
- Separate detached base worktree at `626171e` produced the dark chart control.
  All 12 comparisons have zero mismatches at pixelmatch threshold 0.1; strict
  threshold 0 still detects 0–887 pixels per crop. Do not call these byte-identical.
- Evidence: `/tmp/nbastt-light-cp2/` (page captures, contrast JSON, chart captures,
  control captures and `dark-comparison.json`). Temporary evidence is not tracked.

Re-run with the baseline harness dependencies installed:

```sh
mise x -- node plan/baseline/light-mode.mjs http://localhost:4341 /tmp/light-mode-dev
mise x -- node plan/baseline/tanstack-application.mjs http://localhost:4341 /tmp/light-charts light
# Repeat against the built preview on 4344, and with dark as the last argument.
```

Still checkpoint 3: apply design feedback, explicitly exercise invalid stored
preferences, system changes/reset and no-JS behavior, test first-paint timing,
finish accessibility review and rerun the matrix after refinements. No merge or
deployment until approved.

## Checkpoint 1 evidence

Real Astro dev server on 4341, separate restored SQLite DB and installed deps.
Chromium checked system-dark initialization, click to light, persistence across
reload, `aria-pressed=true`, and 390px season-page overflow: none. No page errors.
Desktop/mobile screenshots: `/tmp/nbastt-light-{desktop,mobile}.png` (initial
bulb fill; center subsequently changed from dark to pale yellow).
Astro check passed after generating this worktree's Worker types. Targeted ESLint
passed. Full feature/browser matrix and build intentionally remain pending.

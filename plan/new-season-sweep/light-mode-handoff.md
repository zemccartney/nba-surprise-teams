# Light-mode handoff for the Showdown agent

## Branch and review state

Base your integration on **`origin/feature/light-mode`**, not the historical
`origin/light-mode` branch. Zack approved the visual work through `059af4a`,
including the paired Stats-chart alignment. Preference/accessibility final
verification is in progress; follow-up fixes will land on this same branch.
No merge to main has been authorized.

From your own Showdown worktree, after preserving your current work:

```sh
git fetch origin
git merge origin/feature/light-mode
```

Do not reset or replace your Showdown work with this branch. This is a shared
application/theming base to integrate into your existing feature.

The repository deploy workflow runs on **every branch push**. Review-only
light-mode pushes use `[skip ci]` to avoid creating a Cloudflare Preview without
approval. Local checks are documented separately; skipped hosted checks are not
claimed as passes. Ask Zack before enabling hosted publishing. Do not copy a
skip marker blindly into an eventual production merge message.

## Integration findings (Showdown at `71f95d6`)

A `git merge-tree` dry run, without touching either working tree, found one
textual conflict: `src/components/charts/tanstack-options.ts`. Showdown changes
the Stats scatter's surprise fill from `t.lime` to `t.green`; light mode uses
**`t.surpriseDot`**. Keep `t.surpriseDot`: it preserves the original lime in dark
mode and the approved lighter green in light mode, independently of pace strokes.
Keep this branch's 76px bottom margin and 56px Team-axis title offset too.

Other shared files auto-merge at that snapshot, but need semantic review:

- `src/components/charts/showdown-standings.ts` uses **`theme.pale`**, which no
  longer exists. Choose a role rather than restoring that overloaded color.
- `src/styles/global.css`: retain your additions _and_ the semantic theme
  blocks. Showdown's red/hover link paints currently bypass theme roles and
  need light-background contrast checking, especially the pale hover color.
- `src/pages/index.astro`, `[seasonId]/index.astro`, `stats.astro`: keep your
  Showdown links/content while preserving the shared nav toggle and role paints.
- `src/components/charts/charts.css`: preserve your scatter-tooltip behavior
  and shared tooltip surface/ink/outline/shadow tokens from light mode.
- `tests/tanstack-charts.test.ts`: keep updated paint roles and paired-chart
  geometry regression checks alongside your tests.

A textual auto-merge is **not** proof that Showdown is correctly themed. Its new
components are not present in this branch and have not been visually validated
here. The image-service branch also overlaps `logo.astro` and `result-emoji.astro`;
coordinate separately before adopting those changes. In particular, retain the
inline skull branch if other emoji rendering changes to an image-service API.

## Theme contract

`html[data-theme="light"|"dark"]` selects semantic custom properties in
`src/styles/global.css`. Palette primitives (`--color-*`) never change meaning.
Use semantic roles for new UI; avoid raw palette colors that happen to work in
dark mode. Prefer the existing shared Link/Table/Popover/ResultEmoji components.

| Purpose                  | Roles                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| Page and tables          | `--surface-page`, `--surface-table-head`, `--surface-row`                     |
| Text                     | `--ink-primary`, `--ink-heading`, `--ink-notice`, `--ink-warning`             |
| Links                    | `--ink-link`, `--ink-link-hover`                                              |
| Controls                 | `--button-surface`, `--button-ink`, `--button-border`, `--button-hover-*`     |
| Tooltips/popovers        | `--popover-surface`, `--popover-ink`, `--popover-outline`, `--popover-shadow` |
| Chart ground/labels/grid | `--chart-surface`, `--chart-axis`, `--chart-grid`                             |
| Positive/negative fills  | `--chart-positive`, `--chart-negative`                                        |
| Pace strokes/focus dots  | `--chart-positive-line`, `--chart-negative-line`                              |
| Surprise scatter dots    | `--chart-surprise-dot`                                                        |
| Season bars              | `--chart-season`, `--chart-alternate`                                         |
| Chart feedback           | `--chart-highlight`, `--chart-band`, `--chart-zero`                           |

The exported `theme` object in `tanstack-style.ts` maps legacy short property
names to these roles. Its `axis`, `grid`, `alternate`, `season`, and `surpriseDot`
properties split the old overloaded paints. `theme.pale` is deliberately removed.
In particular, `theme.lime` is now the **pace line/focus** paint, not generic
foreground; axis labels use `theme.axis` and grids use `theme.grid`.

If Showdown needs a distinct semantic role, add dark and light definitions;
don't force unrelated marks to share a color just to reuse a property. SVG paints
must retain `var(...)` references so mounted charts and open tooltips repaint on
toggle. Do not snapshot CSS colors in JS or remount charts just for a theme change.

## Approved visual details to preserve

- Lavender page and striped cells; borders on every light-mode table cell.
- Shared sticky table headers paint their own inset bottom edge in light mode.
- Small bulb next to About, 44px hit target, 24px artwork; exactly one per page.
- Slate skull/bones and pale-yellow glowing eyes in light mode only. Inline SVG
  has `role="img"` and the original accessible description; no added tab stop.
- Detroit's contrast halo exists only in dark mode.
- Light positive/negative chart bases are lighter; pace strokes/focus dots use
  darker counterparts. Stats season bars use link purple/table-stripe purple.
- Gold chart accents and the light-purple alternate bars are known below-3:1
  exceptions on the pale plot, chosen during visual review. Do not claim full
  WCAG contrast compliance, or silently extend these exceptions to text.

## Verify your integration

Run `mise run setup` as needed in your own worktree and restore its own database.
Use a free dev/preview port; light-mode review occupies 4341 and 4344. Do not
reuse another agent's working DB, build directory, or server process.

Run check/tests/build and exercise **both** real dev and built workerd preview.
The existing harnesses under `plan/baseline/` cover shared pages and charts:

```sh
mise x -- node plan/baseline/light-mode.mjs <base-url> <output-directory>
mise x -- node plan/baseline/tanstack-application.mjs <base-url> <output-directory> light
mise x -- node plan/baseline/tanstack-application.mjs <base-url> <output-directory> dark
```

These scripts require the baseline harness dependencies. Add Showdown-specific
checks rather than assuming existing coverage extends to your routes: both
light/dark; 1440/390/320px; archive and current-season states; standings/marks;
open tooltips and dialogs; keyboard focus; sticky cells; and theme toggles while
content is already mounted. Check first load and intra-site navigation too.

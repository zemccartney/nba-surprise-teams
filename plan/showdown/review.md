# Showdown review

## Current execution status

All implementation checkpoints are complete: reviewed season UI, verified
home/away backfill for all 18,607 archived games, scoreless upcoming schedules
and isolated caching, and the 30-franchise historic Stats chart. See
`venue-backfill.md`, `schedule-checkpoint.md`, and `history-checkpoint.md` for
scope and evidence. The notes below preserve the sequence of visual reviews.

The new chart still needs user visual review. The latest season currently has
no published candidates; no invented odds are included in this branch. Hosted
active-season refresh must be rechecked after real candidates are published
(local workerd's NBA request is 403; Node fetch succeeds, and local cached
island/schedule behavior was browser-tested).

## Review

Local dev server: **http://127.0.0.1:4343** (separate worktree and local DB).
Ports 4341/4342 are now used by the parallel light-mode work; those servers were
left untouched. Log: `/tmp/showdown-dev.log`. Find the current PID with
`lsof -iTCP:4343 -sTCP:LISTEN`.

- `/2025/showdown/`: latest archived season, nine candidates, full result calendar.
- `/2024/showdown/`: another candidate set.
- `/1993/showdown/`: earliest available candidate season.
- `/2025/`: episode and Showdown links beneath the season title.
- `/`: currently the 2026 countdown; correctly has **no** Showdown link because
  candidate standings are not yet showing. The link and standings share the
  same readiness conditional in `src/pages/index.astro`.

Please review title/art sizing, the red accent, table density, matchup layout,
link placement, and mobile wrapping. Candidate seasons only: years without
candidates deliberately have no Showdown route.

Accent proposal: `--color-showdown-red: #ef4c5b`. Measured contrast against the
rendered dark-green background: 4.74:1. Darker reds can be used decoratively,
but this lighter red keeps small navigation/date/table text readable.

## Completed

- Supplied art copied unchanged to application assets (build optimizer handles it).
- 29 season-specific Showdown pages generated.
- Pure candidate selection, W/L/PCT and competition ranking, date grouping.
- Shared ranks, alphabetical ties, no-game teams last with em dashes.
- Historical names/emoji, links to individual team-season pages.
- Large return-to-season link; adjacent-season links removed after review.
- Static archive rendering and current-results deferred island using existing
  loading/error handling. Upcoming schedule support is still checkpoint 2.

## Verified

- Astro check: zero errors/warnings/hints.
- Targeted ESLint: clean.
- Full existing Vitest run: 31 files, 218 tests passed (includes five new tests).
- Astro production build and artifact audit passed (407 audited files).
- Built HTML: all 29 season details link to Showdown; countdown homepage omits it.
- HTTP 200 for 1993, 2024, 2025 Showdown pages.
- Chrome screenshots inspected at 1440px and a true emulated 390px viewport.
  Showdown, season detail, and homepage have no horizontal overflow at 390px.
- Screenshots and CDP capture script: `/tmp/showdown-review/` (not committed).

PR preparation: fast-forwarded this worktree onto production's completed
`main` at `0bac673`, then ran the full `pnpm run build` pipeline successfully:
dependency audit, Astro check, repository formatting/lint/workflow checks,
31 test files / 225 tests, production build and artifact audit (407 files).
This includes the final visual revisions below.

## Visual revision after first review

- Combined title: `SHOWDOWN '25-26`; no separate season label.
- Larger back-link, no adjacent-year navigation.
- Purple question-mark button opens a native modal explaining head-to-head
  candidate statistics; removed the introductory copy.
- Season detail links have wider spacing and stack below 640px.
- Standings use the site's shared Table component; no section heading.
- No matchup section heading or Final labels. One continuous 2px rule under
  each date; more whitespace between dates, no matchup card borders.
- Rechecked Astro types, targeted ESLint and all 218 tests successfully.
- Browser checks at 1440px and 390px: no horizontal overflow. Modal opens,
  Escape closes it, and focus returns to the question-mark button.

## Second visual revision

- Info now uses the shared `Popover` component and its standard question-mark,
  purple body, close control and native Escape/light-dismiss behavior; no custom modal.
- Removed rank column, left-aligned Team header (verified computed alignment).
- Matchup tricodes replace names at 24px, retaining full names in title attributes.
- Date divider glow reuses `--shadow-glow-sm`, clipped to its bottom side.
- Rechecked 390px/1440px layouts, shared popover open/Escape/focus behavior,
  Astro check, targeted ESLint and all 218 tests successfully.

## Third visual revision

- Blank team-column header. Standings now match the season table's 56rem maximum,
  default desktop sizing, compact-below-640px breakpoint, 36px logos, 1rem team
  gap, and responsive full-name/tricode links. Removed bespoke cell sizing.
  Browser comparison at 390px: both tables are 390px wide with 24px type and
  16px cell padding. Desktop Showdown: 896px wide, 36px type, 32px/16px padding.
- Divider glow uses the divider's red at 50% opacity, with the same blur/spread.
- Standard question-mark is positioned above the title's top-right corner.
- Info copy: “Tallying up the results of every time two surprise team candidates
  played each other. This is what analytics is all about”.
- Astro check, targeted ESLint and 218 tests passed. Browser recheck confirms
  no horizontal overflow and working shared popover.

## Fourth visual revision

- Info shortened to “Tallying up whenever two surprise team candidates played
  each other.”
- Matchup logos have explicit 80×80 CSS boxes with `object-fit: contain`, overriding
  the global `img { height: auto }` rule that exposed unequal SVG aspect ratios.
  Browser measurements across all 99 matchups in 2025 show identical opposing
  logo, tricode and score top positions at both 1440px and 390px, including Nov 12.
- Removed the date border. A fuller 70%-opacity red shadow now comes from the
  entire header block, clipped to its underside, rather than from a thin line.
- Targeted ESLint and diff whitespace checks passed; refreshed desktop/mobile
  screenshots, no horizontal overflow, shared popover behavior still verified.

## Historic-chart visual revision

- Enlarged matchup `@` symbols to 36px.
- Removed the chart's supplemental accordion/table.
- Bars alternate the Showdown red with the charts' existing dark red.
- Increased row height to 52px and bar thickness to 40px. Records/percentages
  are overlaid on bars as `W–L | PCT`, at 16px on narrow plots and 20px on wide
  plots, with an outline for contrast. Removed the separate labels gutter.
- Browser recheck: all 30 bars, keyboard tooltips and no horizontal overflow at
  390px and 1440px; no runtime exceptions.

## Remaining review / operational follow-up

- User visual/code review of the new historic Stats chart and data/cache changes.
- Recheck real hosted schedule/results transitions after candidate odds are
  published, including finality status observations already tracked in MAINTENANCE.
- Merge/deploy only after approval; this branch never publishes production.

No production settings or main-checkout files were changed. Canonical venue
metadata was enriched; all existing result rows remain identical.
Stop this server before running sync/build/tests in this worktree; restart with
`pnpm exec astro dev --host 127.0.0.1 --port 4343` afterward.

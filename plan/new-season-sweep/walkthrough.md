# Foundations walkthrough — 2026-09-12

Visual walkthrough approved by Zack. Remaining launch findings are in the
[independent full-stack review](prelaunch-review/README.md).
Initial comparison build: `mise-setup` at `907fd89`.
Preview now serves the uncommitted `chart-parity` fixes described below. Production:
https://nbastt.grepco.net/. Local built preview: http://localhost:4322/, served
by `astro preview` (workerd), not Vite dev. No Cloudflare resources created or
deployments enabled. This session uses the existing Playwright/Chrome tooling;
Codex's Chrome DevTools MCP is not exposed here.

## Review PR stack

All opened as drafts, with navigation links and round-specific review pointers.
Each PR targets the preceding branch, not `main`.

| PR                                                               | Branch         | Base           |
| ---------------------------------------------------------------- | -------------- | -------------- |
| [#9](https://github.com/zemccartney/nba-surprise-teams/pull/9)   | tooling        | main           |
| [#10](https://github.com/zemccartney/nba-surprise-teams/pull/10) | react-removal  | tooling        |
| [#11](https://github.com/zemccartney/nba-surprise-teams/pull/11) | eslint-10      | react-removal  |
| [#12](https://github.com/zemccartney/nba-surprise-teams/pull/12) | deps           | eslint-10      |
| [#13](https://github.com/zemccartney/nba-surprise-teams/pull/13) | trailing-slash | deps           |
| [#14](https://github.com/zemccartney/nba-surprise-teams/pull/14) | astro-7        | trailing-slash |
| [#15](https://github.com/zemccartney/nba-surprise-teams/pull/15) | svg-images     | astro-7        |
| [#16](https://github.com/zemccartney/nba-surprise-teams/pull/16) | mise-setup     | svg-images     |

**Parent drift:** `origin/svg-images` gained docs-only commit `15f967e` after
`mise-setup` branched off. It is not integrated into the tip yet. No history
rewritten; reconcile before final stack integration. Do not squash/delete
intermediate branches without settling stack integration first.

**Deployment gate:** Astro 7 cannot go through the active Pages build path.
Coordinate Workers configuration, preview verification and domain cutover
before integrating/deploying the entire stack.

## Capture method and limits

Compare the same page at 390, 768, 1440 and 1920px. Third-party requests are
blocked for deterministic screenshots. Sizes are **decoded/uncompressed
resource bodies**, not compressed wire bytes or a speed benchmark. Production
includes Sentry and Cloudflare-injected scripts absent from the local build;
raw totals must not be described as application-code savings.

The initial all-page production run reached the last `/nope` page before being
interrupted, leaving no complete summary. Its partial directory
`plan/baseline/runs/2026-09-12-foundations-prod/` is not a completed baseline.
Use the completed page-by-page runs below instead.

## Home `/`

Completed captures:

- `plan/baseline/runs/2026-09-12-walkthrough-home-prod/`
- `plan/baseline/runs/2026-09-12-walkthrough-home-preview/`

Results:

- Both HTTP 200; **4/4 screenshots pixel-identical**.
- Preview: zero browser console errors or failed requests.
- Production's failed requests are the deliberately blocked Cloudflare beacon
  and Sentry ingestion; no page JavaScript exception was reported.
- Preview minus production: HTML −494 B, external CSS +181 B, loaded external
  JS −149,836 B, total decoded resource bodies −151,604 B (−77.0%).
- The home page needs no external application JS in the local build; production
  loads the Sentry client entry and Cloudflare challenge scripts. Do not count
  their absence as a production-ready payload reduction: Sentry still needs
  verification in the deployed Workers build.

Zack approved the home page visually: "home page looks good, proceed."
Screenshot parity does not verify every link, accessibility, or the countdown's
date-boundary behavior.

## Archive `/archive/`

Completed captures:

- `plan/baseline/runs/2026-09-12-walkthrough-archive-prod/`
- `plan/baseline/runs/2026-09-12-walkthrough-archive-preview/`
- Link/navigation probe results: `interactions.json` in the preview run.

Results:

- Both HTTP 200; **4/4 screenshots pixel-identical**, including full document
  heights. No horizontal overflow at any of the four widths.
- Same 29 seasons in the same order. All 33 unique internal destinations
  (season links plus navigation) returned 200 on both sites.
- Only Archive has the active nav class. Clicking the first season reaches
  `/2025/`; Back returns to Archive with its highlight intact on both sites.
- First six Tab stops have the same order (site title, Archive, Stats, About,
  first two seasons).
- Preview: no console errors or failed requests. Production failures are only
  the deliberately blocked third-party beacon/Sentry requests, as on home.
- Preview minus production: HTML −1,902 B, external CSS +181 B, loaded external
  JS −149,099 B, total decoded bodies −152,275 B (−78.6%). Same Sentry/Cloudflare
  comparability caveat as home; not a production savings claim.
- Known deliberate URL difference: preview links include their trailing slash;
  production links omit it and redirect. Direct `/archive` returns **307** in
  workerd preview versus **308** in Pages production, both to `/archive/`.
  Already tracked as a Workers cutover decision, not a newly introduced issue.
- Pre-existing accessibility opportunity: both sites express the active nav
  only through a CSS class, with no `aria-current="page"`. Not a regression;
  optional small improvement for later review.

Zack approved Archive visually: "looks good." No new regression found by
these checks; this is not a full accessibility audit.

## Season `/2025/` — captures 2026-09-13 UTC

Completed captures:

- `plan/baseline/runs/2026-09-13-walkthrough-season-prod/`
- `plan/baseline/runs/2026-09-13-walkthrough-season-preview/`
- `interactions.json` in the preview run records both sites' link, table,
  image, font and popover checks. Open-popover screenshots are in each run's
  `interactions/` directory at 390 and 1440px.

Results:

- Both HTTP 200. Full-page dimensions match at all four widths. **Four pixels
  differ per screenshot**, all on the New Orleans king-cake-baby logo;
  consistent with the documented SVGO precision trade-off. No layout drift.
- All nine standings rows and displayed O/U/pace values match at desktop and
  mobile. All 14 unique internal destinations return 200. No active subnav
  item (correct for a season page), no horizontal overflow.
- All 20 visible images decode on each site at desktop/mobile. Nine additional
  DOM images belong to hidden desktop/mobile name variants; their deferred
  loading is not a rendering failure.
- Episode and Pace popovers have identical copy. Both sites open via keyboard
  Enter, close via Escape, outside click and close button, and return focus to
  the trigger after Escape. Text is regular weight, nonitalic, left-aligned.
- Open popovers sit about 1px higher and 0.5px left on desktop in preview.
  The removed Radix arrow is a previously documented intentional deviation.
- At 390px, production's episode popover is 400px wide and overflows 10px;
  preview correctly constrains it to 390px. Both preview popovers fit the
  viewport. This is an improvement, not a regression.
- Preview has zero console errors/failed requests in captures; production's
  capture errors are only blocked third-party beacon/Sentry requests. Neither
  site raised a page JavaScript exception during interaction probes.
- Preview minus production: HTML −7,592 B, CSS +181 B, external JS −407,322 B,
  total decoded bodies −430,543 B (−17.3%). Of the missing external JS, roughly
  258 KB is React/Radix-related rather than the shared ~149 KB production
  Sentry/Cloudflare overhead. Native popovers require no external client JS;
  inline navigation/responsive scripts still exist.
- Image response bodies drop from 34,826 to 20,470 B (excluding favicon), with
  deduplicated SVG URLs and SVGO. No server islands on this archived season;
  this check does not verify live-season island behavior.

**Pre-existing size finding, not a regression:** the two Iosevka woff2 files
(regular and bold) total **1,972,808 bytes / 1.88 MiB**, identical in production
and preview. They dominate the first-load resource total despite React removal.
Both are real font responses, not HTML fallbacks. Consider font subsetting or
alternative delivery separately; not changed during the parity walkthrough.

Probe lessons: Radix outside-dismiss listeners need a short settling delay
following open, and focus restoration is asynchronous. Checking `img.complete`
on hidden lazy images incorrectly flags them as broken; test visible image
decoding instead. The final interaction probe passed with those corrected.

Zack approved the season page on desktop and mobile: visually identical,
with no perceptible performance drift. Follow-up questions concerned Network
panel sizes, font weight and the four-pixel logo difference.

### Follow-up: compressed transfers versus decoded file sizes

Fresh requests confirmed production sends `Content-Encoding: br`; local
workerd preview sends these assets without content encoding. Consequently,
DevTools' transfer-size column is not an apples-to-apples size comparison.

- Production HTML: 35,824 decoded bytes; a fresh Brotli transfer was 7,101 B
  before headers. Preview HTML: 28,232 decoded/transferred body bytes.
- Compressing both decoded bodies locally with the same Node Brotli defaults
  produced 6,156 B (prod) versus 3,640 B (preview). These are a controlled
  comparison, **not** a prediction of Cloudflare's exact deployed transfer.
- Fresh SVG decoded response sizes prove the optimizer is active:
  Hornets 1,768 → 1,549 B; Pelicans 7,174 → 4,331 B; eliminated skull
  2,108 → 1,816 B. Same source hash in the URL does not mean same contents:
  the optimizer runs after Astro assigns asset filenames.
- The four changed pixels are on the Pelicans logo's edges, not a size/layout
  change. SVGO's default three-decimal geometry precision is the documented
  antialiasing trade-off; imperceptible visually here. No change requested.

**Decision — Zack, 2026-09-13 UTC:** defer font optimization until the end of
all sweep work, alongside the other deprioritized items. Tracked explicitly in
`status.html`, section 5. Not a Foundations merge/deployment blocker.

Font optimization proposal, not implemented: subset both Iosevka weights to a
safe repertoire covering the site's text (including dynamic labels, accented
names, punctuation and mathematical symbols), retaining needed shaping and
retesting all chart/tooltip text. The installed files are already named
`latin`, so changing to a nominal Latin CSS import alone is not the fix.
A system monospace replacement is simpler but changes appearance. Merely
loading popover CSS later would not solve current initial loading: visible
question-mark triggers use Iosevka too.

## Team `/2025/CHA/` — captures 2026-09-13 UTC

Completed captures:

- `plan/baseline/runs/2026-09-13-walkthrough-team-prod/`
- `plan/baseline/runs/2026-09-13-walkthrough-team-preview/`
- `interactions.json` in the preview run contains both sites' complete chart
  payloads, SVG geometry/styles, labels, sampled tooltips and keyboard/popover
  probes. Screenshots of hover and open-popover states are in each run's
  `interactions/` directory.

**Data and ordinary UI:** all 82 serialized chart datapoints, surprise rules
and the 38-win threshold match exactly. Tooltip samples at games 1, 21, 41 and
82 show matching dates, records, projected wins and pace. Stats-table text
matches. All three stats popovers open via Enter, close via Escape/outside/
close button, return focus and fit the viewport at 390 and 1440px. Neither
site raised page JavaScript exceptions during these probes.

**Presentation discrepancies confirmed, not fixed:**

- Production area's computed `fill-opacity` is **0.6**; preview is **1.0**,
  explicitly configured in `team-season-pace.ts`. This accounts for the much
  stronger preview fill; do not attribute it solely to oklch conversion.
- Both domains are 0–82, but production displays y ticks 0/25/50/82 while
  preview displays 0/20/40/60/80 in the DOM probe. Date ticks differ too.
  An initial screenshot suggested overlapping 80/82 labels; the later DOM
  inspection found 80 without 82, so overlap is not a confirmed diagnosis.
- Desktop plot boxes differ: production 636×570 at (172,472), preview 616×548
  at (184,484). Preview lacks production's vertical grid lines. Headers/stats
  positioning is unchanged; full-page dimensions match at all four widths.
- Full-page pixel differences range 2.63–3.70%, concentrated in the chart.
  These must be reviewed, not dismissed as inevitable renderer differences.

**New accessibility regression:** production's chart is keyboard-focusable
and ArrowRight exposes the next point's tooltip. Preview has no focusable
chart element. `aria.enabled` supplies a `role="img"` description (first ten
points), not keyboard exploration of the series. Logged as a fifth Step 4
issue in `review.md` and the status board; the other charts need the same audit.

Payload: preview minus production HTML −8,930 B, external JS −274,401 B,
external CSS −3,937 B, total decoded bodies −290,862 B (−10.0%). As before,
production-only instrumentation affects JS totals; inline CSS is in HTML,
not the external stylesheet subtotal. The font cost remains deferred.

Image re-requests on tooltip interaction have not been isolated/tested by this
probe; the data/copy and keyboard checks above do not settle that report.
This is an archived team season, not a server-island test.

### Team-page decisions and implementation — Step 11

Zack requested: top-align visible plot/table, restore alternating value cells
and vertical dotted grid, try fill opacity halfway between prod and preview,
keep y labels 0/25/50/season length, remove every horizontal gridline except the
solid surprise threshold, and restore keyboard point exploration.

Implemented on **`chart-parity`**, stacked on `mise-setup`, not yet committed.
Preview was rebuilt/restarted on port 4322 with these changes:

- Plot top inset 0; shared Table stripe selector explicitly crosses its body
  slot. Confirmed both dev and preview had transparent rows before the fix:
  Astro 7 required Table's scope on caller-authored rows. Earlier "table
  unchanged" language checked values/layout and missed this styling bug.
- Latest refinement: area opacity **0.8**; vertical dotted split lines on;
  horizontal split lines and y tick marks off. Axis labels only at **0 and the
  actual season length**; threshold line/icon/label remain. Zack said the
  initial 0.75/25/50 trial looked good, then requested these two tweaks.
- Pace chart has a visible keyboard-focus ring and an accessible game selector
  (slider semantics with point descriptions), arrows, Home/End, Escape and
  unobstructed Tab/Shift+Tab. Offscreen lazy charts are discoverable via Tab;
  focus triggers rendering if necessary. Other chart types still await audit.
- Intermediate-width correction: the rendered SVG imposed a 720px automatic
  minimum on the chart grid item, squeezing the table to 224px below 1280px.
  Production uses a 566.4px chart / 377.6px table there. Setting the chart's
  `min-width: 0` restores that original 3:2 split and lets ECharts resize.
  Regression checks cover narrowing through 1280/1279/1150/1030/1024/1023px,
  column shares, single-line records and no page/table overflow.
- Mobile tab-order refinement: Zack noticed that CSS reversal put the chart
  before the table in the tab order. Table-first markup and responsive DOM
  synchronization now match reading order: chart/table at 1024px and above,
  table/chart below. Explicit desktop grid areas prevent hydration layout
  shifts. Focus, selection and open popovers survive breakpoint changes.
- Added five content-independent option tests and a reusable real-browser
  probe in `plan/baseline/chart-parity.mjs`. Full build/verify: 15 tests pass.
  Targeted dev and workerd checks pass at 390/1440 on `/2025/CHA/`,
  `/2011/CHA/`, `/2024/TOR/`; dev smoke 47 images, zero problems.

New artifacts: `runs/2026-09-13-chart-parity-team` (four-width capture),
`runs/2026-09-13-chart-parity-checks` (browser assertions and keyboard shots).
Final refinement artifacts: `runs/2026-09-13-chart-refinement-team` and
`runs/2026-09-13-chart-refinement-checks`. The probe checks mobile question-mark
order before the chart, desktop chart-first order, and resizing with focus/open
popovers, including an older-browser DOM-move fallback. Dev and preview pass.
Read `review.md`, Step 11, for files and manual checklist. **Zack visually
approved the final team-page design:** “perfect. on to the next page.” This
includes 0.8 opacity, endpoint/threshold labels, responsive tab order and stable
intermediate-width table sizing. Screen-reader operation was not manually
verified. The original image revalidation/stats layout/scatter findings are not
claimed fixed.

## Stats walkthrough — started

Production and preview captures completed at all four widths:
`runs/2026-09-13-walkthrough-stats-{prod,preview}`. Both return 200 and page
heights match at each width. Screenshot differences are 4.82% desktop, 8.14%
mobile, 6.44% tablet and 4.54% wide; these are not visual approval or proof of
behavioral parity.

Zack reported plot/top-10 misalignment, unequal columns in both rows, and severe
narrowing/overflow when resizing mounted charts. Production measured equal
704px columns at 1920 and 576px at 1440/1280; preview retained the old SVG width,
squeezing the neighboring section and overflowing after stacking. Explicit
`minmax(0, 1fr)` tracks and zero section minimums restore the original layout.
Stats chart painting is clipped to its host because previously positioned
absolute tooltips can also retain stale geometry during resize.

Surprises x Season: top inset 0 and inward-aligned maximum y label prevent
ECharts from pushing the plot down. Removed outer dotted split lines, keeping
interior gridlines. Categories are the actual sorted season IDs (29 currently),
not a numeric domain starting at 1990 and ending after the latest year. Only
normal bar-gap padding remains at the ends; tooltip data indices are unchanged.
This also removes empty-year bands where the archive has no season.

New `stats-parity.mjs` mounts all three charts before resizing through
1920/1440/1280/1279/1240/1030/1024/768/390 and back. Dev and workerd checks pass
for column equality, containment, top alignment, no dotted frame, bar count,
edge gaps and first/last season tooltip content. Build/verify: 16 tests pass.
Artifacts: `runs/2026-09-13-stats-layout-checks`.

Visual approval pending. Tooltip dismissal/revalidation (an endpoint tooltip
can linger during these probes), stats keyboard access and the lower charts'
axis/style details remain separate open work.

### Stats polish — 2026-09-14

Zack requested narrower mobile margins, no boundary-axis lines on any chart,
dotted green at scatter y=0, and a fix for tooltip flicker/icon requests on
mousemove. Mobile chart margins are now 8px (was 16); Top 10 stays full width.
Shared axes omit min/max split lines and plain axis strokes, exposing the
scatter's existing dotted green zero split line. Threshold/result mark lines
remain intact.

Confirmed ECharts sets string formatter results through `innerHTML`, recreating
icons on repeated updates. `tooltip.ts` now supplies a stable DOM subtree for
synchronous HTML formatters, replacing its contents only when HTML changes;
shared rendering wires this into all four charts. No cache-header workaround.

New `stats-tooltips.mjs` checks all three Stats charts at 1440/390, with 20 real
within-point mousemoves each: heading/image identities remain stable, visible
and decoded; zero image requests during those moves. It also verifies mobile
margins, no dotted boundaries/gray axes and dotted scatter zero. Dev and rebuilt
preview pass this probe, the Stats resize/endpoint probe and pace keyboard
regressions. Full build/verify: 17 tests pass. Latest artifacts:
`runs/2026-09-14-{stats-tooltip,stats-polish,pace-polish}-checks`.
Visual review, stats keyboard access and any separate dismissal issues remain
open; same-point tooltip flicker/revalidation is now addressed.

### Stats approval

Zack confirmed all visual refinements and tooltip behavior look good, then:
“all good to move to the next page I think. stats seems solid.” Stats walkthrough
visually approved. This does not close the separately documented stats keyboard
access or manual screen-reader coverage gaps.

## About and 404 — visually approved

Captures: `runs/2026-09-13-walkthrough-about-{prod,preview}`. Both return 200;
screenshots are pixel-identical at all four widths. Default captures block
third-party resources, so this does not verify the Apple Podcasts player.
Zack approved About visually and separately confirmed the Apple Podcasts
player plays correctly. The 404 page is also approved: the apparent wrapping
difference was unequal viewport widths. Both sites wrap below 504px and stay
on one line at 520px; no CSS change was needed.

## Stats keyboard accessibility — implemented, manual review pending

All three Stats charts now opt into the shared point selector, including lazy
Tab discovery, visible focus, arrows/Home/End, Escape, and untrapped Tab. Spoken
values describe seasons/team counts and names, team results/history, or scatter
season/team/over-under/signed pace/record/result. Seasons traverse chronologically;
team bars follow team-code order; scatter points traverse over/under then pace,
with deterministic name/season tie-breaking. Original ECharts indices are mapped
explicitly; both stacked team series are highlighted. Ordering is explained in
`aria-description`.

Extracted `responsive-order.ts` from the existing team-page helper and reused it
on Stats. Mobile DOM/tab order is Top 10 then season chart; desktop is season
chart then Top 10. Focus/open-popover preservation and the legacy DOM-move
fallback remain. Neither visual layout nor data is changed.

Full type/lint/format and 20 tests pass. Browser probes pass on dev and an
isolated built Workers preview: 29 seasons, 30 teams, 269 scatter points;
keyboard discovery/navigation, matching tooltips, bounds, Escape/Tab, resize,
plus existing Stats layout, image stability and pace keyboard regressions.
Artifacts: `runs/2026-09-14-stats-keyboard-checks`.

**Runtime caveat:** a concurrent Wrangler edit changed the compatibility date
to 2026-09-13 and removed nodejs_compat; installed dev workerd supports only
through 2026-09-10. That edit was preserved. Verification used ignored scratch
configs `.astro/keyboard{.config.mjs,-wrangler.jsonc}` with the previous date
2025-03-21/nodejs_compat and separate output `.astro/keyboard-dist`. New keyboard
preview: http://localhost:4338/stats/ (local Wrangler, launcher PID 4214). Normal
4322 remains the previous build; default-config build/runtime is not verified.
Manual keyboard/screen-reader review remains pending.

### Runtime resolution and active scatter feedback

Zack's `scratch.md` links the updated Cloudflare Node API docs: Node compatibility
is implicit from 2026-08-04. Flag removal was correct; only the date exceeded
installed workerd support. Normal config now uses 2026-09-10 with no explicit
Node flags. Normal dev/build/preview pass; scratch 4338 is stopped and the
current keyboard/feedback build is on **4322**. Prior caveats above are history.

Active scatter points now have a 2px bright purple accent outline, full opacity
and a modest 1.4x size increase, for mouse hover and keyboard navigation. Browser
checks verify exactly one keyboard outline at the selected coordinates and the
hover outline around the mouse target. 21 unit/system tests and the keyboard,
hover/image, layout and pace probes pass; default-config dev smoke also passes.
Artifacts: `runs/2026-09-14-scatter-{feedback,hover}-checks`. Zack approved the
scatter feedback ("looks great"). These probes tested hover and keyboard modes
separately; the subsequent pre-launch review reproduced a double outline when
clicking a dot and an Escape-dismissal failure with focus outside the chart.

## Remaining walkthrough

- Resolve the [pre-launch findings](prelaunch-review/README.md), then repeat the
  relevant browser checks with font-failure and mixed-input cases included.
- Manually review Stats keyboard controls with a screen reader.
- Live-season islands: odds publication activates the upcoming season's island
  rendering, but the action returns early before `season.startDate`. Test island
  plumbing then; use controlled date/feed fixtures to verify the full upstream/
  KV path **before opening night**. Static captures do not verify caching.
- Sentry-enabled hosted build and coordinated Workers cutover checks.

All visual pages are approved. Stats keyboard controls are implemented and
browser-verified, not yet manually screen-reader verified. Same-point tooltip
image requests are resolved. The content-test gap is now independently confirmed
for both empty and stale stores; passing tests alone prove neither population
nor freshness. Tests moved into `tests/`; the move does not fix that gap.

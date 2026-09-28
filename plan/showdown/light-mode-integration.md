# Showdown × light-mode integration

## Review/landing state

- Showdown baseline: `71f95d6`; integrated light-mode base: `41eef71` from
  `origin/feature/light-mode` (PR #18). Do not use historical `origin/light-mode`.
- Zack authorized production landing after final checks and deferred the broader
  code review. Land #18 first, then retarget #17 from `feature/light-mode` to
  main and verify the final diff and checks. Do not drop the later review.
- Incorporated #18's completed preference/accessibility verification, its
  session-versus-local-storage event fix (`b174eb5`), and main's documentation
  reconciliation (`84dde84`). This final merge had no conflicts.
- Feature-branch checkpoint pushes retain `[skip ci]` to avoid unnecessary
  preview publication. Authorized main merge messages must not contain a skip
  marker: those merges should run the normal production deployment workflow.
- Only the Showdown worktree was changed. Light-mode ports 4341/4344 and the
  other agents' branches, working databases and build outputs were untouched.

## Resolution and role decisions

- One textual merge conflict, in `tanstack-options.ts`: retain `t.surpriseDot`.
  Also retain light mode's paired-chart bottom margins and axis-title offsets.
- Showdown bars use `theme.season` / `theme.alternate`, not removed `theme.pale`.
  This preserves Zack's requested match to Surprises × Season: green/pale green
  in dark mode, approved purple/lavender in light mode. No bar overlays.
- Both scatter charts use `theme.surpriseDot`. **Intentional difference from the
  light-mode handoff:** its dark role now references `--chart-positive`, not
  the lime pace stroke. Zack explicitly requested standard-positive-green dots
  for both scatters during Showdown review. Light mode already maps this way.
  Pace strokes/focus paints and eliminated-dot colors are unchanged.
- Added semantic Showdown heading/link/hover/glow/title-shadow roles. Dark
  colors remain unchanged; light uses dark rose text, a subtler date glow and
  no title shadow. Added `--ink-positive` so winner scores remain distinct
  (dark lime / light dark-green) rather than becoming identical to loser scores.
- Shared table borders/sticky edge, popovers, toggle, Detroit treatment and skull
  rendering are inherited. Decorative Showdown artwork retains its source art.
- The body-mounted scatter tooltip still uses shared semantic popover tokens.
  Full histories remain available on hover with a 40px gap and viewport-bounded
  width; vertical extension and nearest-center dot selection are unchanged.

## Verification and review URLs

- Full build, formatting/lint/workflow lint, dependency audit, **259 tests in
  35 files**, and artifact audit (**412 files**) pass.
- Final landing preflight reran all **180** preference/accessibility/first-paint
  scenarios on the combined tree: Chromium, Firefox and WebKit, dev and built
  workerd. Also reran the 36-case Showdown matrix in each runtime.
- Corrected one test assumption, not app behavior: Chromium's Playwright
  `no-preference` can expose the host OS's current dark/light setting instead of
  forcing light. The unforced-scheme case now checks the browser-reported media
  preference. The explicit dark/light, storage and first-paint tests are intact.
- Shared light-mode harness: 54 page/theme/viewport cases in **each** runtime,
  including preference persistence, denied storage, cross-tab updates, nav,
  light table borders, skull paints, contrast and live chart repaint.
- Shared TanStack application harness: both themes in **each** runtime; retained
  paired-chart alignment, plot/axis styles and keyboard interactions.
- New `plan/baseline/showdown-theme.mjs`: 36 cases in **each** runtime across
  dark/light and 1440/390/320px. Covers current countdown/season navigation,
  1993/2024/2025 archives, full historical tooltips, no horizontal overflow,
  focus, open-popover repaint, mounted SVG/tooltip identity across theme toggle,
  role references and light Showdown/hover/winner text contrast ≥4.5:1 against
  both page and striped backgrounds.
- Existing light-mode gold/alternate-bar chart contrast exceptions are inherited,
  not counted as passes or silently extended to text. No full WCAG claim.
- Active candidate odds are still absent: no 2026 Showdown route or fake odds
  were introduced. Existing live-loader/action/calendar tests remain green;
  real hosted upcoming-to-final verification remains the operational follow-up.

Local dev: `http://127.0.0.1:4343`; built workerd: `http://127.0.0.1:4345`.
Review `/2025/showdown/`, `/1993/showdown/`, `/2025/`, `/stats/#showdown-history`.
Browser reports/screenshots: `/tmp/showdown-light/` (not committed).

```sh
cd plan/baseline && pnpm install --frozen-lockfile && cd ../..
node plan/baseline/showdown-theme.mjs http://127.0.0.1:4345 /tmp/showdown-theme-review
```

## Suggested code/data review walkthrough

1. **Candidate membership and results** — `src/data/showdown.ts` filters to each
   season's preseason candidates, never their eventual success/elimination.
   It computes head-to-head W/L/PCT from qualifying completed games.
2. **Archive source and venues** — archived results come from the committed
   SQLite snapshot through the existing virtual archive loader. Migration 003
   adds a separate venue table; backfill did not reorder/change original game
   identities, team arrays, dates or scores. See `venue-backfill.md` for all
   18,607 games and the independently verified Mexico City source disagreement.
3. **Live fetch/cache** — `src/loaders/live/{index,utils}.ts` and
   `src/actions/index.ts`: optional `includeSchedule` normalizes the full NBA
   schedule from the same upstream response as results. Results require status
   3 and positive scores. Scoreless scheduled games cannot enter standings.
   The separate `<seasonId>:schedule` KV key prevents a results-only cache hit
   from satisfying schedule requests; validation, stale fallback and a maximum
   six-hour schedule freshness window are covered by loader/action tests.
4. **Calendar and rendering** — `src/data/showdown-calendar.ts` merges finals
   with upcoming games without duplicates, uses explicit away/home identities,
   and supplies Eastern times / TBD / pending labels. `components/showdown/`
   shares presentation between archived SSR and the deferred live island.
5. **Historic charts** — `src/data/showdown-history.ts` aggregates only archived
   candidate-vs-candidate games using the established franchise grouping. Sum
   W/L before calculating PCT; do not average seasonal percentages. Named-era
   records reconcile to franchise totals. `stats.astro` supplies both charts
   with the same data and existing historical names/logos.
6. **Interaction/theme layer** — `showdown-{standings,scatter}.ts`,
   `scatter-tooltip.ts`, `tanstack-style.ts`, and semantic CSS. Data fetching
   and cache behavior were not changed by this theme integration.

Local workerd NBA access still returns 403, while Node fetch works. Earlier
schedule UI verification used normalized real-feed cache fixtures, not a claimed
successful local upstream refresh. See `schedule-checkpoint.md` for evidence and
`MAINTENANCE.md` for the hosted active-season follow-up.

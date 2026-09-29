# Post-launch visual tweaks — local review

Moved into `/Users/enlow/proj/nba-surprise-teams` (main checkout), uncommitted
for Zack's review and eventual commit/push. Not pushed or deployed. Review
`/2011/`, `/2025/`, and `/2025/showdown/` using the main checkout's server.
The old Showdown worktree's review servers have been stopped.

## Requested changes

- Light sticky tables now use separate borders with zero spacing and one owner
  for each shared edge. Header cells carry real top/bottom borders rather than
  an inset shadow plus a collapsed border. This avoids the double line/gap at
  rest and keeps the edge visible when stuck. Non-sticky and dark tables retain
  their previous border model.
- Light Showdown ink: `oklch(0.5338 0.2175 29.07)`.
- Light Showdown hover: `oklch(0.3952 0.1597 25.41 / 63.9%)`.
- Light standard-link hover and active states use
  `oklch(0.3115 0.192 270.82)`. Normal links retain production's
  `oklch(42% 0.21 277.023)`. No separate visited-link styling.
- Matchup tricodes are purple underlined links in light mode with those same
  interaction colors; score colors are independent of anchor hover.
- Light winning scores use `oklch(0.5766 0.2954 307.54)`, superseding the
  earlier lime and pink trials.

## Evidence and caveats (before the final winning-score color correction)

- 259 tests / 35 files, typecheck, format/lint/workflow checks pass. Standalone
  Astro build and artifact audit pass (412 files).
- **The standard `pnpm run build` gate is NOT green:** dependency audit currently
  reports moderate `GHSA-3wwx-pv8p-q78v` in transitive `undici` (via
  Wrangler/Miniflare; patched >=7.29.1). Dependencies were not changed as part
  of these visual tweaks. Resolve the advisory before another production ship;
  local preview was built by running the remaining checks/build separately.
- New `plan/baseline/sticky-header.mjs`: 36 pixel cases each in dev/built
  Chromium and WebKit, rest/scrolled, 1440/390/320px; mobile uses 3× DPR.
  Confirms one continuous ~2 CSS-pixel edge, no shadow duplicate. This is
  emulated mobile WebKit coverage, not a physical iOS Chrome test.
- Built shared-theme matrix: 54 cases; Showdown matrix: 36 cases in each runtime.
  Explicit hover checks confirm black purple-link/tricode hover and exact
  translucent Showdown hover.
- The requested trial colors are not claimed as accessibility contrast passes.
  Against the lavender page: red ~3.89:1, composited red hover ~3.79:1, lime
  winner ~1.03:1. That low-contrast lime trial has since been replaced.
  Against the striped background: ~2.89:1 / 3.27:1 / 1.31:1 respectively.
  The contrast harness now composites translucent ink over its actual ground
  and records these ratios rather than retaining the previous 4.5:1 claim.
- Reports/screenshots: `/tmp/showdown-tweaks/`. Dark styling is preserved.

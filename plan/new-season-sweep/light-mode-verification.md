# Light mode — checkpoint 3 verification

[PR #18](https://github.com/zemccartney/nba-surprise-teams/pull/18) ·
`feature/light-mode` · [Showdown handoff](light-mode-handoff.md)

**Automated verification passes.** The approved visual design is unchanged.
Awaiting Zack's PR/everyday-browser review and explicit integration approval.
No merge into main, hosted preview creation or production deployment.

Main advanced to documentation-only `84dde84` during verification. That commit
is merged **into this feature branch**, preserving its Foundations sign-off,
seasonal-readiness and tooling-review notes. The only conflict was the shared
status-board tally; combined totals are 25 done / 2 in progress / 3 blocked /
16 open, 46 tracked. No application code changed during reconciliation.

## Preference, keyboard and first-paint results

`plan/baseline/light-mode-preferences.mjs` exercises the real pages and inline
head initialization, not a duplicate theme implementation in a unit fixture.

| Engine                      | Version       |       Dev | Built workerd preview |
| --------------------------- | ------------- | --------: | --------------------: |
| Chromium / installed Chrome | 153.0.8010.53 | 29 passed |             31 passed |
| Playwright Firefox          | 155.0         | 29 passed |             31 passed |
| Playwright WebKit           | 26.6          | 29 passed |             31 passed |
| **Total**                   |               |    **87** |                **93** |

**180 scenario runs; zero uncaught application errors.** Counts include repeat
coverage across engines/runtimes, not 180 distinct preference behaviors.

Verified:

- Unset preference follows both light and dark system settings, including live
  changes. No system preference resolves to light.
- Saved `light`/`dark` wins over system settings. Empty, `auto`, `LIGHT` and
  literal `null` values are ignored and follow the system instead.
- Keyboard activation via Space/Enter, accessible name and pressed state,
  visible 2px focus outline, retained focus, saved choice, reload, site
  navigation and back/forward history navigation.
- Cross-document local-storage changes, removal, invalid values and `clear()`;
  unrelated keys do not affect the theme. Clearing an explicit choice restores
  live system following in receiving tabs.
- Same-origin iframe **session-storage events do not change the theme**;
  local-storage events from that same iframe still work.
- Denied reads and denied writes under both system settings. The toggle still
  works in memory and ignores later OS changes after an explicit click; reload
  returns to the system when a usable saved preference is unavailable.
- Built preview additionally denies the entire `localStorage` getter under
  both system settings. Dev tests avoid breaking Astro's unrelated toolbar with
  a global denial; this is why preview has two more cases per engine.
- JavaScript disabled: existing dark fallback, hidden toggle, readable static
  standings, native popover activation/Escape and ordinary navigation. Even a
  saved light preference does not expose a nonfunctional toggle.
- First paint under both OS settings, with unset, opposite and invalid saved
  values: **no wrong-theme application body frame observed**. CSS is delayed
  250ms and all module scripts are withheld, including Astro's inlined production
  toggle module. The classic inline head initializer alone selects the correct
  theme. Frame samples, paint timing entries where supported and screenshots
  are retained for all six combinations per browser/runtime.

## Bug fixed

The storage listener previously accepted `sessionStorage` events. A same-origin
iframe writing `sessionStorage.theme = "light"` could change a dark parent even
though its actual `localStorage.theme` was still `"dark"`.

`color-scheme-toggle.astro` now captures the available local-storage reference
and accepts events only when `event.storageArea` matches it. Reads/writes retain
the denied-storage fallback. The regression waits for the real session event
before checking that the parent remains dark, then checks that a local-storage
event from the same iframe still updates it. This passes in all six runs.

## Full regression rerun

- Build and full check (types, formatting, ESLint and offline workflow audit).
- **223 tests**, 30 test files.
- **54 page/theme/width combinations per runtime**, dev and built preview;
  sticky-edge pixels, nav alignment, skull paints/ARIA, live SVG/tooltip repaint.
- All four chart interactions in both themes and both runtimes, at
  **1440/390/320px**; paired plot/title geometry remains aligned.
- Dev smoke: **32 external images checked, zero missing, zero problems**.
  Inline skulls are covered by the page harness, not counted as external images.

No palette, sizing or chart geometry changed during checkpoint 3. Previous dark
skull pixel comparisons and approved visual comparisons remain documented in
[the implementation log](light-mode.md).

## Boundaries and browser notes

- On macOS WebKit, the keyboard traversal probe uses **Option+Tab** to include
  all controls under its default reduced keyboard-navigation setting. Space
  and Enter activation both work. No custom app tab-order workaround was added.
- Firefox's automation storage seeding hangs when combined with disabled JS.
  The no-JS probe instead seeds storage through automation on the origin before
  visiting the checked page; application scripts remain disabled throughout.
- The Apple podcast iframe is replaced by a static placeholder in this focused
  harness. Its intermittent cross-origin telemetry errors are not application
  failures, and its internals are not claimed as theme/accessibility coverage.
- Back/forward navigation passed, but these runs reported `pageshow.persisted`
  as false: **a true back/forward-cache restoration was not exercised**.
- First-paint evidence concerns rendered application content, not the browser's
  blank navigation canvas, every network timing, or a complete video audit.
- Requested gold chart accents and purple alternate bars remain documented
  below-3:1 contrast exceptions. No blanket WCAG compliance claim or screen
  reader audit is implied by these automated checks.
- Showdown and image-service code were not merged into this worktree. The
  [handoff](light-mode-handoff.md) lists the known integration work for their agents.

## Reproduce / inspect

```sh
# Baseline harness dependencies must be installed/available first.
mise x -- node plan/baseline/light-mode-preferences.mjs http://localhost:4341 /tmp/theme-dev chromium dev
mise x -- node plan/baseline/light-mode-preferences.mjs http://localhost:4344 /tmp/theme-preview chromium preview
# Replace chromium with firefox or webkit for the other installed engines.
```

Artifacts on this machine: `/tmp/nbastt-light-cp3/`. Each preference run has
`checks.json` with `isPassed`, scenarios, versions, errors and frame samples,
plus no-JS and first-paint screenshots. Page/chart directories contain the
regression captures and contrast measurements. Build/check/test/smoke logs are
`/tmp/nbastt-light-cp3-*.log`.

For Zack's final everyday-browser pass: open
[2011](http://localhost:4344/2011/) and [Stats](http://localhost:4344/stats/), toggle,
navigate, reload, go back and open a second tab. No new behavior decision is
needed unless something feels wrong. To return to system following manually,
remove the `theme` local-storage key **and reload that tab**; other tabs receive
the reset event directly. There is no separate reset control in this UI.

Review-only pushes use `[skip ci]` because the repository automatically deploys
all branches. Hosted checks/deployment are deliberately skipped, not reported
as passes. Obtain approval before creating a hosted preview or merging to main.

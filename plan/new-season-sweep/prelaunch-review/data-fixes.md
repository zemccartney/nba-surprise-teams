# D1/D3 fixes — review and verification

Checkpoint before these fixes: **`4c3bc20`**. D1/D3 are now fixed locally, not
committed, pushed or deployed. Production still exhibits the old behavior.
Other pre-launch review findings remain separate, open work.

## What changed

### D1: projected wins

`src/content-utils.ts`, `projectedWins()`:

```js
// Before
Math.floor(numGames * (wins / gamesPlayed));
// After (with an explicit zero-games guard)
Math.floor((numGames * wins) / gamesPlayed);
```

Multiplication of these small integers is exact; doing it first avoids a
premature floating-point approximation. Flooring remains intentional for
fractional projected wins. `currentWinPct()` itself is unchanged.

This fixes both projected records and derived pace wherever the helper is used:
team tables, pace-chart points and Stats data. It does not edit game results,
over/unders, actual records or the actual-win surprise classification.

### D3: historical names

- `src/pages/stats.astro`: season-chart names now use
  `resolveTeamName(team, season.id)`, not `team.id`.
- `src/content-utils.ts`, `getTeamHistory()`: the NJN period reads the New Jersey
  name; the BKN period reads the Brooklyn name. IDs, logos and date ranges are
  unchanged. The UI expresses the final season's end year, hence 2011 in the
  internal period becomes 2012 in displayed history.

These corrections flow into both visible tooltips and keyboard descriptions.
No archive JSON was changed.

## Code review order

```sh
git diff 4c3bc20 -- src/content-utils.ts src/pages/stats.astro
git diff -- .gitignore .prettierignore
```

Then read the new files (untracked files do not appear in ordinary `git diff`):

1. `tests/content-utils.test.ts` — cache-independent helper regressions.
2. `plan/baseline/data-corrections.mjs` — actual page/tooltip/keyboard regressions.

The only unrelated housekeeping is excluding `.claude/worktrees/` from the
parent repository's Git/lint and formatting scope. A nested image-service
checkout caused the normal format gate to inspect 45 unrelated files. None of
that checkout's files were reformatted, deleted or otherwise changed.

## Manual review

Current built preview: **http://localhost:4322/**. Hard-refresh if necessary.

### Team pages

Compare the actual record with **Pace (Projected Record)**:

| Page                                          | Old production value | Correct local value |
| --------------------------------------------- | -------------------- | ------------------- |
| [/2004/CHI/](http://localhost:4322/2004/CHI/) | `+3 (46 - 36)`       | `+4 (47 - 35)`      |
| [/2006/TOR/](http://localhost:4322/2006/TOR/) | `+3 (46 - 36)`       | `+4 (47 - 35)`      |
| [/2012/GSW/](http://localhost:4322/2012/GSW/) | `+0 (46 - 36)`       | `+1 (47 - 35)`      |

Each actual record remains **47–35**. Tab to its chart and press End: the final
point must also show 47 projected wins and the corrected pace. Check the same
values in the corresponding team-season scatter tooltips on Stats.

### Stats names

On [Stats](http://localhost:4322/stats/):

1. Hover the **2013–14** season bar, or focus the season chart and navigate to
   that season. Charlotte must be **Charlotte Bobcats**, not Hornets.
2. Hover **BKN** in the team chart, or focus it, press Home and then Right once.
   Its history must say:
   - **New Jersey Nets (1977 - 2012)**
   - **Brooklyn Nets (2012 - present)**
3. Keyboard descriptions should use those same corrected names. This browser
   check is not a substitute for the outstanding manual screen-reader pass.

## Automated verification

```sh
mise x -- pnpm test
mise x -- pnpm run verify
# Local build without credentialed Sentry upload:
env -u SENTRY_AUTH_TOKEN mise x -- pnpm run build

# Against the current built preview:
mise x -- node plan/baseline/data-corrections.mjs --base http://localhost:4322
# The same probe can target a running dev server with --base http://localhost:4337
```

The 13 new helper tests cover:

- The three completed 47–35 regressions.
- Every possible completed record for 82-, 72-, 66- and 50-game seasons.
  The 50-game case is an explicitly synthetic fixture because no such season
  is archived in this dataset.
- Zero games, winless/undefeated starts and fractional projections rounded down.
- Charlotte's historical-name boundaries.
- Both BKN and NJN entry points into the same correct Nets history.

The helper tests mock only the Astro content lookup boundary using freshly
imported JSON and a synthetic shortened-season fixture. They do not depend on
`.astro/data-store.json`. This does **not** fix the broader system-test gap R2.
The browser probe catches the real Stats call-site mistake that a helper-only
Charlotte test would miss.

### Results this round

- Normal build (including type/lint/format/tests): passed, **34 tests**.
- New data-correction browser probe: passed against **dev and built preview**.
- Existing built-preview `chart-parity`, `stats-parity`, `stats-tooltips` and
  `stats-keyboard` probes: all passed.
- Dev server stopped afterward; built preview remains on port 4322.
- No production changes, deployment, push or post-checkpoint commit.

Earlier identified font-failure and mixed-input interaction bugs are not fixed
by this data round; passing these probes must not be interpreted as clearing
those separate findings.

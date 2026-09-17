# About the Data: Guide to site maintenance

For exact commands, recovery and refresh semantics, see [data/README.md](data/README.md).
For the system anatomy, open [docs/data-system.html](docs/data-system.html).

## Intuition and Principles

Intuition: We can favor self-reliance, thereby reducing complexity and surface area for errors, because the data at play is eventually static (games end, seasons end, results are final, historical facts). When there's no possibility of new data (out-of-season, but more commonly, in-season and we can tell by looking at the schedule that there haven't been new results since last poll), serve the system's records of data.

As much of the site is static as possible; rely on external data sources i.e. take on complexity of maintaining a system for sourcing data on-demand only when no way to know data ahead of time. Specifically, results of games happening in real time. We're balancing the tradeoff of currency and reliability / complexity management vs. stability / simplicity:

- Show results as close to real-time as possible (rules out building as best tool for handling updates)
- The more self-contained, the more reliable (fewer ways to fail outside my control)

What, then, is the intuition for — literally, running `astro build` — in site’s maintenance?

- As much as possible, maintain the site via build: If you want to publish new data, that's a rebuild; do not write logic for the site to adapt in real-time e.g. shift to next season by detecting date
- Build process is a pure function: can reason about results solely from taking stock of state of seasons (their data / loaders); snapshot of filesystem at the point in time of building. Therefore, CANNOT use dates to make decisions, as date logic assumes rechecking overtime, which means surprising, inconsistent results from the build, depending on time of build. That is, the build would vary depending on the date of building; non-data variances in build are unacceptable. No surprises in building, always know what you’re launching based on data on disk
- Do not handle missing data; if the build detects insufficient data for rendering a page, throw and crash, fix by sourcing that data. Another way: if we don’t have the data to meet rendering expectations in our pages, then the site’s in an incomplete, un-presentable state and shouldn’t be published.

## Rules

Rules are enforced by STRICT SQLite constraints, plain domain schemas, dataset
validation and system tests. `data/dump.sql` is canonical; `data/tracker.db` is an
ignored editing workspace. Astro content collections are no longer used.

All individual seasons MUST:

- If in the past (end date is before today):
  - have a set of surprise team candidates (`teamSeasons`)
  - have archived games (in the SQLite store), representing the complete results of that season (82 games played per surprise team participating)
    - every game MUST have at least one surprise team participating
    - CONVENTION: Leniency for the most recently past season. Factor in grace period to allow for hot fixes, assuming I'll be slow to source data and store in repo, don't block the build during that time

- If current or upcoming:
  - MUST NOT have static games; source games data on-demand (live loader). While technically possible to SSR in past e.g. call the nba api in our archiver, disallow in practice
    to follow the principle of preferring static output

Rules of seasons in general (these seem silly to write out; being (overly) explicit; these are enforced less by any tooling, more by the limitations
of the NBA's machinery, how it only has one season running and publishes season schedules on a predictable cadence):

- Only ever one current or upcoming: several pages render the latest season. For example, the home page should show
  the current season, if one, the recently past one during the summer after, then info about the upcoming one once schedule
  data is released. Given the rule against data logic in rendering, that our site's output is static, we can't enforce these rules
  at request time, in static HTML files, whose date check will correspond to the moment in time of the build.
  - CONVENTION: I want the home page to show most recent, past season throughout the summer, until
    we're closer to the start of the next season. As in, build should fail if you add next season before that cutoff (if
    season start date is greater than ~90 days away / however many days between typical schedule release and typical season
    start)
- No overlapping: start and end dates should be completely separate ranges of time across all seasons

To make explicit a principle from the above: date logic is acceptable in our test suite, as it does not impact deployed output, but rather, is meant to yell
at you if you've broken rules meant to keep the site running well.

## Lifecycle

What does this look like in practice? Requirements for keeping the site current with NBA happenings

### End of season (~second week of April)

The day after the season ends (or as close as possible):

1. Run `pnpm run archive:latest` to fetch and transactionally archive the latest ended season.
   - Run `mise run data:dump`, then `pnpm run archive:diff` to review ordinary SQL changes.
   - Stage the dump and rebuild; editing the working DB alone never changes preview/production.
2. Review hardcoded limits on graphs; new data still fits? possible to make less fragile?
3. Review stats leaderboard; does slicing still work? Way to automate this? (e.g. if items past 10th are same number, collapse into single row listing their count)

**EXPECT:**

- **Home:** display unchanged, shows same season, but now static output, not server island
- **Archive:** now includes latest season
- **Season detail:** display unchanged, shows same season, but now static output, not server island
- **Team/Season detail:** display unchanged, shows same season, but now static output, not server island
- **Stats:** now includes latest season

### Schedule Release (~mid August (August 15 for 2024, August 18 for 2023))

When the NBA releases their schedule:

1. Prepare a plain season record and run `mise run data -- add-season --input /tmp/season.json`.
2. Dump, review, stage and rebuild. Dev refreshes automatically after the successful edit.

**EXPECT:**

- **Home:** shows countdown to next season
- **Archive:** Nothing; still only shows archived seasons
- **Season detail:** No page generated, as should only generate pages for seasons with over/unders
- **Team/Season detail:** No page generated, no data available
- **Stats:** no effect

### Odds Release (~mid September (Slam n' Jam pod intro for 2024 surprise teams on Sept. 20))

When surprise teams and their odds are announced:

1. For any teams not yet registered i.e. never been a surprise team candidate:
   - create a logo, store under `src/assets/images/emoji`
   - add new NBA codes to `src/loaders/live/utils.ts::teamCodeSchema`
   - add a plain team record (including its emoji asset name) with `mise run data -- add-team --input /tmp/team.json`

2. Add each candidate with `mise run data -- add-team-season --season YEAR --team CODE --over-under ODDS`.
3. Dump, review, stage and rebuild. Use `update-odds` explicitly for corrections.

**EXPECT:**

- **Home:** Shows standings table for upcoming season, empty values for all record and pace displays
  - pages rendered on-demand, no additional static output
- **Archive:** no effect
- **Season detail:** Shows standings table for upcoming season,empty values for all record and pace displays
  - pages rendered on-demand, no additional static output
  - No explicit link anywhere e.g. not on archive, but visitable directly
  - Title is above table, not in heading
- **Team/Season detail:** Pages generated for season's teams, no data yet; data loaded via SSR (server island)
- **Stats:** no effect

### Preseason (~early October): re-check the live data service

The NBA schedule endpoint is undocumented for our purposes. Re-check our working
assumptions each preseason, independently of Astro's loader and candidate-team
filtering. Request headers can affect access; the current working request sends
`Accept: application/json` and `Referer: https://www.nba.com/`.

1. Run [`scripts/check-nba-feed.ts`](scripts/check-nba-feed.ts) to fetch and
   analyze the schedule directly, without Astro or KV. Supply the expected
   season, updating it each year:

   ```sh
   mise x -- node scripts/check-nba-feed.ts --season 2026-27 --save /tmp/nba-preseason-before.json
   ```

   For a styled, human-readable report, add `--pretty` (Gum is pinned through
   mise). The same analysis runs; JSON remains the default for agents/tools:

   ```sh
   mise x -- node scripts/check-nba-feed.ts --season 2026-27 --pretty
   mise x -- node scripts/check-nba-feed.ts --season 2026-27 --input /tmp/nba-preseason-before.json --pretty
   ```

   Use different snapshot filenames for before/during/after observations;
   `--save` deliberately refuses to overwrite. Re-analyze a saved response
   without making a request:

   ```sh
   mise x -- node scripts/check-nba-feed.ts --season 2026-27 --input /tmp/nba-preseason-before.json
   ```

   Reports include HTTP status (live requests), feed season/timestamp, ID
   prefixes, labels, statuses, score samples and the first preseason game.
   `unassignedMatchups` counts games with at least one blank/missing team tricode:
   usually future bracket placeholders, not missing results. The captured 2026–27
   schedule has seven (four Cup quarterfinals, two semifinals, one championship).
   Structural errors, duplicate IDs or a mismatched expected season exit 1;
   working-theory warnings exit 0 but require manual review. A clean report of
   scheduled games does not verify in-progress/final behavior. No assumptions
   about ID chronology, contiguous numbering, or a complete published schedule.
   This is a manual maintenance tool, not an automatic network test in CI/hooks.

2. Confirm the first preseason game's current schedule. For the captured 2026–27
   feed, it is Miami at Toronto on **October 3, 2026, 7 p.m. Eastern**; re-check
   rather than hardcoding this date in the diagnostic.
3. Save observations before tipoff, while a game is underway, and after it ends.
   **TEMP/TODO: resolve finality behavior.** Do scores update during play? Does
   `gameStatus` change from 1 to 2 to 3, and does 3 correspond to Final on this
   endpoint? The current loader treats positive scores for both teams as a
   completed result; leave that behavior unchanged until these observations are
   reviewed. Today's all-zero preseason schedule cannot answer this question.
4. Cross-check Cup championship identification. Our working prefix is `006`;
   the inspected entry has `gameLabel: Emirates NBA Cup`,
   `gameSubLabel: Championship`, `seriesText: Neutral Site`, and
   `gameSubtype: in-season-knockout`. Labels are observations, not contractual
   requirements. Group, quarterfinal and semifinal games count toward the
   regular season and must remain included. The loader now excludes `006` from
   both result selection and next-refresh scheduling, retaining the existing
   season-date window. Raw provider `gameId` is retained as `nbaGameId` in live
   output; the site's existing internal `id` is unchanged.
5. Separately inspect deployed server-island responses/cache headers at season
   start, then after games finish and cached data becomes stale. Preseason feed
   inspection does not exercise this path: the current action returns empty
   games **without expiresAt** before `season.startDate`. Its calculated cache
   header is therefore absent then. Once active, compare cache duration with the
   loader's expected completion of the earliest incomplete **candidate-team**
   game, not necessarily the league's opening game. Check that later requests
   actually refresh results; one correct header does not prove that transition.

**EXPECT:**

- No changes to source data, KV, or deployed routing from the feed diagnostic.
- Unknown or contradictory metadata prompts review, not an automatic change to
  the application's interpretation of NBA data.
- Cache compatibility has two parts: normalized output is validated by
  `src/loaders/live/utils.ts` (once on loader return, again when reading
  persisted data), and the action checks the loader-owned `LIVE_DATA_VERSION`. When changing interpretation or
  selection rules, consider invalidating old data even if its shape still
  parses. Record each version change and its reason in the loader's changelog.
- Invalid/incompatible cached data is never an outage fallback. If no valid
  backup exists and the feed fails, report failure rather than empty records.
  An explicit old cache version is an expected, silent refresh. Malformed JSON,
  a missing version envelope, or invalid current-version data is reported to
  Sentry before recovery, without cached values in the error. Loader/upstream
  validation failures are reported even when a valid backup serves the page.

## Infrastructural Points

- Purpose of KV: be as self-reliant as possible while collecting season in-progress
  - reduce dependency on API (assume unreliable source; endpoint I stumbled on by observing network activity on stats.nba.com; gets me the data I want, but no contract with this service)
  - immediately store results in real time, so we have some backup of live results; use this backup instead of calling out to the API
    if we know, based on schedule, that our copy of data is up to date (fetching data from API would be a no-op)
    - fallback if unreliable API disappears; at least we have something to serve, could manually patch results while looking for
      new source
- KV writes have no storage expiration/TTL. The JSON `expiresAt` is our refresh
  deadline, not deletion time; expired validated data remains an outage backup.
  KV replication/edge caching is eventually consistent and separate from that
  deadline. A version change rejects old values on read; it does not purge
  replicas or HTTP caches.
- set caching headers based on approximate calculation of time remaining until new results in data (when games finish)
  - reduce load times for end user, reduce round trips to server to render view based on network call (KV or API call, depending on if data fresh)
  - also, saves on KV usage; fewer calls since cache headers tell browser: results on server won't change for x time, so don't
    bother re-querying

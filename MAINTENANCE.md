# About the Data: Guide to site maintenance

## Principles

As much of the site is static as possible; rely on external data sources i.e. take on complexity of maintaining a system for sourcing data on-demand only when no way to know data ahead of data. Specifically, results of games happening in real time. We're balancing the tradeoff currency and reliability / complexity management:

- Show results as close to real-time as possible (rules out building as best tool for handling updates)
- The more self-contained, the more reliable (fewer ways to fail outside my control)

What, then, is the intuition for building in site’s maintenance?

- As much as possible, maintain the site via build: If you want to publish new data, that's a rebuild; do not write logic for the site to adapt in real-time e.g. shift to next season by detecting date
- Build process is a pure function: can reason about results solely from taking stock of state of seasons (their data / loaders); snapshot of filesystem at the point in time of building. Therefore, CANNOT use dates to make decisions, as date logic assumes rechecking overtime, which means surprising, inconsistent results from the build, depending on time of build. No surprises in building, always know what you’re launching based on data on disk
- Do not handle missing data; if the build detects insufficient data for rendering a page, throw and crash, fix by sourcing that data. Another way: if we don’t have the data to meet rendering expectations in our pages, then the site’s in an incomplete, un-presentable state and shouldn’t be published.

## Rules

Rules the data must follow for the site to work. Some of these are enforced by Astro's content system. Some checked
in render / at dev and build time. Some are conventions, my personal requirements to enforce with custom logic

All individual seasons MUST:

- If in the past (end date is before today):

  - have a set of surprise team candidates (`teamSeasons`)
  - have static games (in `content/games.json`), representing the complete results of that season (82 games played per surprise team participating)
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
    season start date is greater than ~90 aways / however many days between typical schedule release and typical season
    start)
- No overlapping: start and end dates should be completely separate ranges of time across all seasons

To make explicit a principle from the above: date logic is acceptable in our test suite, as it does not impact deployed output, but rather, is meant to yell
at you if you've broken rules meant to keep the site running well.

## Lifecycle

What does this look like in practice? Requirements for keeping the site current with NBA happenings

### End of season (~second week of April)

The day after the season ends (or as close as possible):

1. Create games archive for newly ended season: `npx tsx archiver.ts` --> should add `games.json` to `src/data/seasons` folder
2. Review hardcoded limits on graphs; new data still fits? possible to make less fragile?
3. Review states leaderboard; does slicing still work? Way to automate this? (e.g. if items past 10th are same number, collapse into single row listing their count)

**EXPECT:**

- latest season's pages now converted to static output
- latest season's data now shows up in archive and stats pages

- **Home:** display unchanged, shows same season, but now static output, not server island
- **Archive:** now includes latest season
- **Season detail:** display unchanged, shows same season, but now static output, not server island
- **Team/Season detail:** display unchanged, shows same season, but now static output, not server island
- **Stats:** now includes latest season

### Schedule Release (~mid August (August 15 for 2024, August 18 for 2023))

When the NBA releases their schedule:

1. Add a new season to `src/content/seasons.json`

**EXPECT:**

- **Home:** shows countdown to next season
- **Archive:** Nothing; still only shows archived seasons
- **Season detail:** No page generated, as should only generate pages for seasons with over/unders
- **Team/Season detail:** No page generated, no data available
- **Stats:** no effect

### Odds Release (~mid September (Slam n' Jam pod intro for 2024 surprise teams on Sept. 20))

When surprise teams and their odds are announced:

1. For any teams not yet registered i.e. never been a surprise team candidate:
   a. create a logo, store under `src/assets/images/emoji`
   b. register the emoji name in `src/content/utils.ts::emojiByTeam`
   c. add team codes (3 letter identifier used in NBA API), to `src/content.config.ts::teamCodeSchema`
   d. add teams to `src/content/teams.json`
2. Add team seasons to `src/content/teamSeasons.json`

**EXPECT:**

- **Home:** Shows standings table for upcoming season,empty values for all record and pace displays
  - pages rendered on-demand, no additional static output
- **Archive:** no effect
- **Season detail:** Shows standings table for upcoming season,empty values for all record and pace displays
  - pages rendered on-demand, no additional static output
  - No explicit link anywhere e.g. not on archive, but visitable directly
  - Title is above table, not in heading
- **Team/Season detail:** Pages generated for season's teams, no data yet; data loaded via SSR (server island)
- **Stats:** no effect

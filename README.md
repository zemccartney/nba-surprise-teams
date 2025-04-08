# NBA Surprise Teams Tracker

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                       |
| :------------------------ | :------------------------------------------- |
| `npm run dev`             | Starts local dev server at `localhost:4321`  |
| `npm run build`           | Build your production site to `./dist/`      |
| `npm run preview`         | Preview your build locally, before deploying |
| `npm run astro -- --help` | Get help using the Astro CLI                 |
| `npm run deps`            | Helper to check and update dependencies      |

## Maintenance Considerations

### Icon sourcing

- Emojis are from Twitter's emoji set
  - Looked up and downloaded from https://twemoji-cheatsheet.vercel.app/
  - recolored as needed
- Hourglass icon from https://phosphoricons.com/

### Cloudflare

- Semi-regularly review and update node compatibility date: https://developers.cloudflare.com/workers/configuration/compatibility-flags/#setting-compatibility-flags
  - Setting in CF dashboard, work build settings

**TODO: Figure out how wrangler file used for Pages config... is it? Had been seeing build log ignoring file, reporting as invalid toml even though json?**

### Dependencies

TODO Figure out sensible, repeatable practice

Account for:

- lack of time
- security
- minimizing deps (ties to lack of time)
- anything else?

### Data

- data stored in KV
- Intuition: Reach out to a source with live data only when monitoring game results in real-time; when there's no possibility of new
  data (out-of-season, but more commonly, in-season and we can tell by looking at the schedule that there haven't been
  new results since last poll), be self-reliant
  - Purpose of KV: be self-reliant as possible while collecting season in-progress
    - reduce dependency on API (assume unreliable source; endpoint I stumbled on by observing network activity on stats.nba.com;
      gets me the data I want, but no contract with this service)
    - immediately store results in real time, so we have some backup of live results; use this backup instead of calling out to the API
      if we know, based on schedule, that our copy of data is up to data (fetching data from API would be a no-op)
      - fallback if unreliable API disappears; at least we have something to serve, could manually patch results while looking for
        new source
  - Data is eventually static (games end, seasons end, results are final, historical facts), so eventually store season results
    as static files within the application, serve directly
  - set caching headers based on approximate calculation of time remaining until new results in data (when games finish)
    - reduce load times for end user, reduce round trips to server to render view based on db call (or API call, depending on if data fresh)
    - also, saves on KV usage; fewer calls since cache headers tell browser: only results on server won't change for x time, so don't
      bother re-querying

#### Off-season

TODO

- when to prep for new season
- what to do with KV? clear once all data is stored on file?

#### Lifecycle

- schedule release: ~mid August (August 15 for 2024, August 18 for 2023)
- odds release: ~mid September (Slam n' Jam pod intro for 2024 surprise teams on Sept. 20)

#### Adding Data

**TODO Fill in**

1. Add season id to consts
2. Add any new teams to consts

These steps will trigger typescript errors in the data/teams file

3. Add a branch to `SeasonData` (`src/data/types`), documenting the teams participating in the new season
4. Add a new folder, named by the id of the new season, under `src/data/seasons`
5. Add a `data.ts` file, define data about the season and candidate teams
6. Import to `src/data/seasons/index.ts` and register on the `normalized` map.

TS intuition:

- Define and expand types to describe allowable space of data, such that data entry is constrained to those
  types, that you see type errors while adding data
- Structuring data as lookup tables allows restricting allowable "queries" i.e. season ids or team ids within a season. The
  entity ids used as keys set the literal values allowable for keying into ("searching") our data

<!--

**TODO: Cleanup**

// type errors if data defined incorrectly (correct seasonId associations)
// error if I try to write / mutate any data (normalized or base)
// methods for getting data a.) flag error if given non-existent entity b.) return type is guaranteed given correctly typed input (no | undefined in return types)
// so callers don't have to confirm correct value given back

/// define atomic facts (seasons, team codes)
// then, fill in details about those facts w/ records
// records should be immutable
/// as const on innter data to expose literal types, then freeze

## UPDATING

- Review final season episode ref on over/under section of sources
- Review hardcoded limits on graphs; new data still fits?
- Review insights leaderboard; does slicing still work? Way to automate this? (e.g. if items past 10th
  are same number, collapse into single row listing their count)
- ADDING PISTONS FROM THIS YEAR WILL BREAK LAST ROW IN top 10 leaderboard table:
  teams that surprised by +6; 10th row will no longer be +6
  (MAKE A CHECKLIST FOR RETIRING SEASONS / MAKE CHARTS LESS FRAGILE)
- if changes to shape of data stored in KV, update cache key

-->

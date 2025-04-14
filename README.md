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

## Maintenance

### Lifecycle

Requirements for keeping the site current with NBA happenings

#### End of season (~second week of April)

The day after the season ends:

1. Create games archive for newly ended season: `npx tsx archiver.ts` --> should add `games.json` to `src/data/seasons` folder
2. Review hardcoded limits on graphs; new data still fits? possible to make less fragile?
3. Review states leaderboard; does slicing still work? Way to automate this? (e.g. if items past 10th are same number, collapse into single row listing their count)

EXPECT:

- latest season's pages now converted to static output
- latest season's data now shows up in archive and stats pages

#### Schedule Release (~mid August (August 15 for 2024, August 18 for 2023))

When the NBA releases their schedule:

1. Add season id to [`SeasonId`](./src/data/types.ts#L465)
2. Add new season
   a. folder under `src/data/seasons`
   b. add `data.ts` file, fill in with season id and data range
   - might need to `@ts-ignore` data file for now, given won't be included in `SeasonData` type
3. Register season in "store" i.e. add to [`normalized`](./src/data/seasons/index.ts#L43)

EXPECT:

- home page now shows countdown to next season

#### Odds Release (~mid September (Slam n' Jam pod intro for 2024 surprise teams on Sept. 20))

When surprise teams and their odds are announced:

1. Add a branch to [`SeasonData`](./src/data/types.ts#L30), documenting the teams participating in the new season
   a. add teams as needed (logos, to `data/teams.ts`)
2. add team seasons to season in `data/seasons/{seasonId}/data.ts`; re-enable type checking, fill in, should
   be no errors

EXPECT:

- home page now shows standings table for upcoming season, empty values for all record and pace displays
  - pages rendered on-demand, no additional static output

### Additional Considerations

#### KV Cache Key

Need to update our action's `SCHEMA_ID` if shape of data stored in KV ever changes

#### Icon sourcing

- Emojis are from Twitter's emoji set
  - Looked up and downloaded from https://twemoji-cheatsheet.vercel.app/
  - recolored as needed
- Hourglass icon from https://phosphoricons.com/

#### Cloudflare

- Semi-regularly review and update node compatibility date: https://developers.cloudflare.com/workers/configuration/compatibility-flags/#setting-compatibility-flags
  - Setting in CF dashboard, work build settings

#### Data

Intuition: Reach out to a source with live data only when monitoring game results in real-time; when there's no possibility of new data (out-of-season, but more commonly, in-season and we can tell by looking at the schedule that there haven't been new results since last poll), be self-reliant

- Purpose of KV: be as self-reliant as possible while collecting season in-progress
  - reduce dependency on API (assume unreliable source; endpoint I stumbled on by observing network activity on stats.nba.com; gets me the data I want, but no contract with this service)
  - immediately store results in real time, so we have some backup of live results; use this backup instead of calling out to the API
    if we know, based on schedule, that our copy of data is up to data (fetching data from API would be a no-op)
    - fallback if unreliable API disappears; at least we have something to serve, could manually patch results while looking for
      new source
- Data is eventually static (games end, seasons end, results are final, historical facts), so eventually store season results
  as static files within the application, serve directly
- set caching headers based on approximate calculation of time remaining until new results in data (when games finish)
  - reduce load times for end user, reduce round trips to server to render view based on network call (KV or API call, depending on if data fresh)
  - also, saves on KV usage; fewer calls since cache headers tell browser: only results on server won't change for x time, so don't
    bother re-querying

### TS intuition

- Define and expand types to describe allowable space of data, such that data entry is constrained to those
  types, that you see type errors while adding data
- Structuring data as lookup tables allows restricting allowable "queries" i.e. season ids or team ids within a season. The entity ids used as keys set the literal values allowable for keying into ("searching") our data

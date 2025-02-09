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

## Local dev

**Prerequisites**

- Turso CLI
  - see https://docs.turso.tech/sdk/ts/orm/drizzle

To run locally:

1. In one terminal tab/window: `turso dev` (starts db server)
2. `echo 'TURSO_URL=http://127.0.0.1:8080' > .env` (config to talk to db server)
3. `npm run dev`

## Maintenance Considerations

### Icon sourcing

- Emojis are from Twitter's emoji set
  - Looked up and downloaded from https://twemoji-cheatsheet.vercel.app/
  - recolored as needed
- Hourglass icon from https://phosphoricons.com/

## Dependencies

TODO Figure out sensible, repeatable practice

Account for:

- lack of time
- security
- minimizing deps (ties to lack of time)
- anything else?

### Data

- DB hosted in Turso account (prod and dev dbs)
- Intuition: Reach out to a source with live data only when monitoring game results in real-time; when there's no possibility of new
  data (out-of-season, but more commonly, in-season and we can tell by looking at the schedule that there haven't been
  new results since last poll), be self-reliant
  - Purpose of db: be self-reliant as possible while collecting season in-progress
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
    - also, saves on Turso usage; fewer db calls since cache headers tell browser: only results on server won't change for x time, so don't
      bother re-querying

## Off-season

TODO

- when to prep for new season
- what to do with the db? clear once all data is stored on file?

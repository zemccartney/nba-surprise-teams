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

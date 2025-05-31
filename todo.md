Goal is to dramatically simplify my TS implementation by a.) removing unnecessarily complex
types b.) switch data to astro's content layer, removing utility functions better handled by content queries

- [x] create a content.config.ts, registering schemas for existing data types: teams, seasons, and team seasons;
      base the team ids on the TeamCode type; games can be in json files, teams can be a single json file, teamseasons can
      be json files, too
- [x] migrate existing data to a content directory:
  - [ ] teams.json , moved from existing list of teams
  - [ ] seasons.json, properties moved from existing data.ts files
  - [ ] games/{season year}.json, moving existing games.json files
  - [ ] teamSeasons.json, moving team season maps from data.ts files
- [ ] get rid of unnecessarily complicated types and usage: DeepReadonly, SeasonData. Propose any others
- [ ] Sweep utils used throughout the site, replacing as applicable with content queries

- [ ] update the archiver.ts to import the season data from the new seasons json files
- [ ] Any unused exports from content-utils
- [ ] Move files: constants and content-utils in top level; get rid of data dir

## Questions for later

- how to deal with seasons.id typed as string, default behavior of content loader; astro bug?
- i think will be useful to keep using the team code and season id types?
- did utils.ts get subsumed into content utils? better organization?
- does enforcing the team code type actually matter?

## LEAVING OFF

surprises by team chart; unclear how getTeamHistory was used, need to reinstitute somehow

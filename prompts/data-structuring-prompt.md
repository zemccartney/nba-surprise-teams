I'm trying to gather NBA preseason over/under projection data and structure it for use in a Typescript app.
I've currently setup one example, for the current season, following this structure:

```ts
{
  id: 2024,
  startDate: "2024-10-22",
  endDate: "2025-04-13",
  episodeUrl:
    "https://podcasts.apple.com/us/podcast/embiid-extension-surprise-teams-pelicans-preview/id1358187061?i=1000670194276",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 35.5,
      seasonId: 2024,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.BKN]: {
      overUnder: 19.5,
      seasonId: 2024,
      teamId: TEAM_CODES.BKN,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 29.5,
      seasonId: 2024,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 27.5,
      seasonId: 2024,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.DET]: {
      overUnder: 24.5,
      seasonId: 2024,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.POR]: {
      overUnder: 22.5,
      seasonId: 2024,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 30.5,
      seasonId: 2024,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 29.5,
      seasonId: 2024,
      teamId: TEAM_CODES.UTA,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 20.5,
      seasonId: 2024,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;
```

For context of code used:

```ts
export type SeasonData = (Season & {
  teams: unknown; // require implementation of property by season
}) &
  (
    | {
        id: 2024;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.BKN
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2024 }
        >;
      }
    | {
        id: 2023;
        teams: Record<
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.SAS
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2023 }
        >;
      }
    | {
        id: 2022;
        teams: Record<
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.SAS
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2022 }
        >;
      }
    | {
        id: 2021;
        teams: Record<
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.SAS
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2021 } // TODO Enforce that teamId matches Record key
        >;
      }
  );

export const TEAM_CODES = Object.freeze({
  ATL: "ATL",
  BKN: "BKN",
  CHA: "CHA",
  CHI: "CHI",
  CLE: "CLE",
  DET: "DET",
  HOU: "HOU",
  IND: "IND",
  MIN: "MIN",
  OKC: "OKC",
  ORL: "ORL",
  POR: "POR",
  SAC: "SAC",
  SAS: "SAS",
  TOR: "TOR",
  UTA: "UTA",
  WAS: "WAS",
} as const);

const teams = {
  [TEAM_CODES.ATL]: { id: TEAM_CODES.ATL, name: "Atlanta Hawks" },
  [TEAM_CODES.BKN]: { id: TEAM_CODES.BKN, name: "Brooklyn Nets" },
  [TEAM_CODES.CHA]: { id: TEAM_CODES.CHA, name: "Charlotte Hornets" },
  [TEAM_CODES.CHI]: { id: TEAM_CODES.CHI, name: "Chicago Bulls" },
  [TEAM_CODES.CLE]: { id: TEAM_CODES.CLE, name: "Cleveland Cavaliers" },
  [TEAM_CODES.DET]: { id: TEAM_CODES.DET, name: "Detroit Pistons" },
  [TEAM_CODES.HOU]: { id: TEAM_CODES.HOU, name: "Houston Rockets" },
  [TEAM_CODES.IND]: { id: TEAM_CODES.IND, name: "Indiana Pacers" },
  [TEAM_CODES.MIN]: { id: TEAM_CODES.MIN, name: "Minnesota Timberwolves" },
  [TEAM_CODES.OKC]: { id: TEAM_CODES.OKC, name: "Oklahoma City Thunder" },
  [TEAM_CODES.ORL]: { id: TEAM_CODES.ORL, name: "Orlando Magic" },
  [TEAM_CODES.POR]: { id: TEAM_CODES.POR, name: "Portland Trail Blazers" },
  [TEAM_CODES.SAC]: { id: TEAM_CODES.SAC, name: "Sacramento Kings" },
  [TEAM_CODES.SAS]: { id: TEAM_CODES.SAS, name: "San Antonio Spurs" },
  [TEAM_CODES.TOR]: { id: TEAM_CODES.TOR, name: "Toronto Raptors" },
  [TEAM_CODES.UTA]: { id: TEAM_CODES.UTA, name: "Utah Jazz" },
  [TEAM_CODES.WAS]: { id: TEAM_CODES.WAS, name: "Washington Wizards" },
} satisfies Record<TeamCode, Team>;

export type SeasonId = 2024 | 2023 | 2022 | 2021;
```

And attached are csvs of raw over/under data I've gathered.

Please structure each csv into a season comparable to the example provided. the only teams included per season should be those whose over/under is less than 36 games
Skip dates, I'll fill in later.
Please output one season per ts file.

As you go, fill in any missing data as follows, outputting in its own file:

- for any team not represented in current `TEAM_CODES` and teams, add a `TEAM_CODE` following
  their standard abbreviation and add a corresponding entry in `teams`
- for each new season, add its starting year to the `SeasonId` type
- for each season, add a branch in the `SeasonData` type for that season, documenting the surprise team candidates in each season

Try one example and show me to review and confirm or edit before proceeding through the rest.

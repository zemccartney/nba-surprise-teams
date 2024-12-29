// https://stackoverflow.com/a/55505556
// unique three-letter code
export const TEAM_CODES = {
  ATL: "ATL",
  BKN: "BKN",
  CHA: "CHA",
  CHI: "CHI",
  DET: "DET",
  POR: "POR",
  TOR: "TOR",
  UTA: "UTA",
  WAS: "WAS",
} as const;

// https://www.totaltypescript.com/books/total-typescript-essentials/deriving-types#using-as-const-for-javascript-style-enums
export type TeamCodeType = (typeof TEAM_CODES)[keyof typeof TEAM_CODES];

export interface Team {
  id: TeamCodeType;
  name: string;
}

export interface Season {
  id: number; // Represents the opening date year of the season e.g. 2024 if 24-25 season
  startDate: string;
  endDate: string;
}

export const SEASONS: readonly Season[] = [
  // TODO Does readonly do anything here?
  {
    id: 1,
    startDate: "2024-10-22",
    endDate: "2025-04-13",
  },
] as const; // TODO does as const do anything here?

export const TEAMS: readonly Team[] = [
  {
    id: TEAM_CODES.ATL,
    name: "Atlanta Hawks",
  },
  {
    id: TEAM_CODES.BKN,
    name: "Brooklyn Nets",
  },
  {
    id: TEAM_CODES.CHA,
    name: "Charlotte Hornets",
  },
  {
    id: TEAM_CODES.CHI,
    name: "Chicago Bulls",
  },
  {
    id: TEAM_CODES.DET,
    name: "Detroit Pistons",
  },
  {
    id: TEAM_CODES.POR,
    name: "Portland Trail Blazers",
  },
  {
    id: TEAM_CODES.TOR,
    name: "Toronto Raptors",
  },
  {
    id: TEAM_CODES.UTA,
    name: "Utah Jazz",
  },
  {
    id: TEAM_CODES.WAS,
    name: "Washington Wizards",
  },
] as const;

interface TeamSeason {
  overUnder: number;
  season: Season["id"];
  team: TeamCodeType;
}

export const TEAM_SEASONS: readonly TeamSeason[] = [
  {
    overUnder: 35.5,
    season: 1,
    team: TEAM_CODES.ATL,
  },
  {
    overUnder: 19.5,
    season: 1,
    team: TEAM_CODES.BKN,
  },
  {
    overUnder: 29.5,
    season: 1,
    team: TEAM_CODES.CHA,
  },
  {
    overUnder: 27.5,
    season: 1,
    team: TEAM_CODES.CHI,
  },
  {
    overUnder: 24.5,
    season: 1,
    team: TEAM_CODES.DET,
  },
  {
    overUnder: 22.5,
    season: 1,
    team: TEAM_CODES.POR,
  },
  {
    overUnder: 30.5,
    season: 1,
    team: TEAM_CODES.TOR,
  },
  {
    overUnder: 29.5,
    season: 1,
    team: TEAM_CODES.UTA,
  },
  {
    overUnder: 20.5,
    season: 1,
    team: TEAM_CODES.WAS,
  },
] as const;

/* Service Methods */

export const getSeasonById = (id: Season["id"]) =>
  SEASONS.find((s) => s.id === id);

export const getTeamById = (id: TeamCodeType) => TEAMS.find((t) => t.id === id);

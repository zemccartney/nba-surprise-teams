import type { SeasonId, Team, TeamCode } from "./types";

import * as Utils from "../utils";
import { TEAM_CODES } from "./constants";

export const emojiByTeam: Record<TeamCode, string> = {
  ATL: "feather",
  BKN: "dragon",
  BOS: "shamrock",
  CHA: "hornet", // honeybee emoji, re-colored
  CHI: "bull", // ox emoji, re-colored
  CLE: "whammer", // https://sportsmascots.fandom.com/wiki/Whammer_(Cleveland_Cavaliers)
  DAL: "mav",
  DEN: "nuggets",
  DET: "piston",
  GSW: "warriors",
  HOU: "rocket",
  IND: "pacer",
  LAC: "clipper",
  LAL: "giraffe",
  MEM: "grizzly",
  MIA: "heat",
  MIL: "deer",
  MIN: "wolf",
  NJN: "nets",
  NOH: "fleur-de-hornet",
  NOK: "fleur-de-hornet",
  NOP: "king-cake-baby",
  NYK: "tophat",
  OKC: "bison",
  ORL: "magic",
  PHI: "bell",
  PHX: "sun",
  POR: "hiking-boot",
  SAC: "crown",
  SAS: "bat",
  SEA: "space-needle",
  TOR: "raptor", // t-rex emoji, re-colored
  UTA: "saxophone",
  VAN: "bear",
  WAS: "wizard", // mage emoji, re-colored
};

const teams = Utils.deepFreeze({
  [TEAM_CODES.ATL]: { id: TEAM_CODES.ATL, name: "Atlanta Hawks" },
  [TEAM_CODES.BKN]: { id: TEAM_CODES.BKN, name: "Brooklyn Nets" },
  [TEAM_CODES.BOS]: { id: TEAM_CODES.BOS, name: "Boston Celtics" },
  [TEAM_CODES.CHA]: {
    alternativeNames: [
      { duration: [2004, 2014], logo: "bobcat", name: "Charlotte Bobcats" },
    ],
    id: TEAM_CODES.CHA,
    name: "Charlotte Hornets",
  },
  [TEAM_CODES.CHI]: { id: TEAM_CODES.CHI, name: "Chicago Bulls" },
  [TEAM_CODES.CLE]: { id: TEAM_CODES.CLE, name: "Cleveland Cavaliers" },
  [TEAM_CODES.DAL]: { id: TEAM_CODES.DAL, name: "Dallas Mavericks" },
  [TEAM_CODES.DEN]: { id: TEAM_CODES.DEN, name: "Denver Nuggets" },
  [TEAM_CODES.DET]: { id: TEAM_CODES.DET, name: "Detroit Pistons" },
  [TEAM_CODES.GSW]: { id: TEAM_CODES.GSW, name: "Golden State Warriors" },
  [TEAM_CODES.HOU]: { id: TEAM_CODES.HOU, name: "Houston Rockets" },
  [TEAM_CODES.IND]: { id: TEAM_CODES.IND, name: "Indiana Pacers" },
  [TEAM_CODES.LAC]: { id: TEAM_CODES.LAC, name: "Los Angeles Clippers" },
  [TEAM_CODES.LAL]: { id: TEAM_CODES.LAL, name: "Los Angeles Lakers" },
  [TEAM_CODES.MEM]: { id: TEAM_CODES.MEM, name: "Memphis Grizzlies" },
  [TEAM_CODES.MIA]: { id: TEAM_CODES.MIA, name: "Miami Heat" },
  [TEAM_CODES.MIL]: { id: TEAM_CODES.MIL, name: "Milwaukee Bucks" },
  [TEAM_CODES.MIN]: { id: TEAM_CODES.MIN, name: "Minnesota Timberwolves" },
  [TEAM_CODES.NJN]: { id: TEAM_CODES.NJN, name: "New Jersey Nets" },
  [TEAM_CODES.NOH]: { id: TEAM_CODES.NOH, name: "New Orleans Hornets" },
  [TEAM_CODES.NOK]: {
    id: TEAM_CODES.NOK,
    name: "New Orleans/Oklahoma City Hornets",
  },
  [TEAM_CODES.NOP]: { id: TEAM_CODES.NOP, name: "New Orleans Pelicans" },
  [TEAM_CODES.NYK]: { id: TEAM_CODES.NYK, name: "New York Knicks" },
  [TEAM_CODES.OKC]: { id: TEAM_CODES.OKC, name: "Oklahoma City Thunder" },
  [TEAM_CODES.ORL]: { id: TEAM_CODES.ORL, name: "Orlando Magic" },
  [TEAM_CODES.PHI]: { id: TEAM_CODES.PHI, name: "Philadelphia 76ers" },
  [TEAM_CODES.PHX]: { id: TEAM_CODES.PHX, name: "Phoenix Suns" },
  [TEAM_CODES.POR]: { id: TEAM_CODES.POR, name: "Portland Trail Blazers" },
  [TEAM_CODES.SAC]: { id: TEAM_CODES.SAC, name: "Sacramento Kings" },
  [TEAM_CODES.SAS]: { id: TEAM_CODES.SAS, name: "San Antonio Spurs" },
  [TEAM_CODES.SEA]: { id: TEAM_CODES.SEA, name: "Seattle Supersonics" },
  [TEAM_CODES.TOR]: { id: TEAM_CODES.TOR, name: "Toronto Raptors" },
  [TEAM_CODES.UTA]: { id: TEAM_CODES.UTA, name: "Utah Jazz" },
  [TEAM_CODES.VAN]: { id: TEAM_CODES.VAN, name: "Vancouver Grizzlies" },
  [TEAM_CODES.WAS]: {
    alternativeNames: [
      {
        // 1974 is the historically accurate first year of this name, but isn't one of the tracked seasons
        // @ts-expect-error: "Type '1974' is not assignable to type 'SeasonId'"
        duration: [1974, 1996],
        logo: "rebounding",
        name: "Washington Bullets",
      },
    ],
    id: TEAM_CODES.WAS,
    name: "Washington Wizards",
  },
} satisfies Record<TeamCode, Team>);

export const getTeamHistory = (teamId: TeamCode) => {
  if ([TEAM_CODES.BKN, TEAM_CODES.NJN].includes(teamId)) {
    return Utils.deepFreeze([
      {
        duration: [1977, 2012],
        logo: emojiByTeam[TEAM_CODES.NJN],
        name: teams[TEAM_CODES.NJN].name,
        teamId: TEAM_CODES.NJN,
      },
      {
        duration: [2012],
        logo: emojiByTeam[TEAM_CODES.BKN],
        name: teams[TEAM_CODES.BKN].name,
        teamId: TEAM_CODES.BKN,
      },
    ]);
  }

  if ([TEAM_CODES.OKC, TEAM_CODES.SEA].includes(teamId)) {
    return Utils.deepFreeze([
      {
        duration: [1967, 2008],
        logo: emojiByTeam[TEAM_CODES.SEA],
        name: teams[TEAM_CODES.SEA].name,
        teamId: TEAM_CODES.SEA,
      },
      {
        duration: [2008],
        logo: emojiByTeam[TEAM_CODES.OKC],
        name: teams[TEAM_CODES.OKC].name,
        teamId: TEAM_CODES.OKC,
      },
    ]);
  }

  if ([TEAM_CODES.MEM, TEAM_CODES.VAN].includes(teamId)) {
    return Utils.deepFreeze([
      {
        duration: [1995, 2001],
        logo: emojiByTeam[TEAM_CODES.VAN],
        name: teams[TEAM_CODES.VAN].name,
        teamId: TEAM_CODES.VAN,
      },
      {
        duration: [2001],
        logo: emojiByTeam[TEAM_CODES.MEM],
        name: teams[TEAM_CODES.MEM].name,
        teamId: TEAM_CODES.MEM,
      },
    ]);
  }

  if (teamId === TEAM_CODES.CHA) {
    return Utils.deepFreeze([
      {
        duration: [1988, 2002],
        logo: emojiByTeam[TEAM_CODES.CHA],
        name: teams[TEAM_CODES.CHA].name,
        teamId: TEAM_CODES.CHA,
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { ...teams[TEAM_CODES.CHA].alternativeNames[0]!, teamId: TEAM_CODES.CHA },
      {
        duration: [2014],
        logo: emojiByTeam[TEAM_CODES.CHA],
        name: teams[TEAM_CODES.CHA].name,
        teamId: TEAM_CODES.CHA,
      },
    ]);
  }

  if (teamId === TEAM_CODES.WAS) {
    return Utils.deepFreeze([
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { ...teams[TEAM_CODES.WAS].alternativeNames[0]!, teamId: TEAM_CODES.WAS },
      {
        duration: [1997],
        logo: emojiByTeam[TEAM_CODES.WAS],
        name: teams[TEAM_CODES.WAS].name,
        teamId: TEAM_CODES.WAS,
      },
    ]);
  }

  if ([TEAM_CODES.NOH, TEAM_CODES.NOK, TEAM_CODES.NOP].includes(teamId)) {
    return Utils.deepFreeze([
      {
        duration: [2002, 2005],
        logo: emojiByTeam[TEAM_CODES.NOH],
        name: teams[TEAM_CODES.NOH].name,
        teamId: TEAM_CODES.NOH,
      },
      {
        duration: [2005, 2007],
        logo: emojiByTeam[TEAM_CODES.NOK],
        name: teams[TEAM_CODES.NOK].name,
        teamId: TEAM_CODES.NOK,
      },
      {
        duration: [2007, 2013],
        logo: emojiByTeam[TEAM_CODES.NOH],
        name: teams[TEAM_CODES.NOH].name,
        teamId: TEAM_CODES.NOH,
      },
      {
        duration: [2013],
        logo: emojiByTeam[TEAM_CODES.NOP],
        name: teams[TEAM_CODES.NOP].name,
        teamId: TEAM_CODES.NOP,
      },
    ]);
  }

  return false;
};

export const getTeamById = (id: TeamCode) => teams[id];

export const getTeams = () => Object.values(teams);

export const matchAlternativeName = (seasonId: SeasonId, teamId: TeamCode) => {
  const team = getTeamById(teamId) as Team;

  if (team.alternativeNames) {
    return team.alternativeNames.find(
      (altName) =>
        altName.duration[0] <= seasonId && altName.duration[1] >= seasonId,
    );
  }
};

export const resolveTeamName = (seasonId: SeasonId, teamId: TeamCode) => {
  const team = getTeamById(teamId) as Team;

  if (!team.alternativeNames) {
    return team.name;
  }

  const altLookup = matchAlternativeName(seasonId, teamId);

  return altLookup?.name || team.name;
};

export const getCurrentTeamLogo = (teamId: TeamCode) => {
  return Utils.getEmoji(emojiByTeam[teamId]);
};

export const getTeamSeasonLogo = (seasonId: SeasonId, teamId: TeamCode) => {
  const altName = matchAlternativeName(seasonId, teamId);
  return Utils.getEmoji(altName?.logo || emojiByTeam[teamId]);
};

import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2012-04-26",
  id: 2011,
  shortened: {
    numGames: 66,
    reason: "Shortened by lockout",
  },
  startDate: "2011-12-25",
  teams: {
    [TEAM_CODES.CHA]: {
      overUnder: 19.5,
      seasonId: 2011,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 17.5,
      seasonId: 2011,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DET]: {
      overUnder: 21.5,
      seasonId: 2011,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 23.5,
      seasonId: 2011,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 27.5,
      seasonId: 2011,
      teamId: TEAM_CODES.NJN,
    },
    [TEAM_CODES.NOH]: {
      overUnder: 25.5,
      seasonId: 2011,
      teamId: TEAM_CODES.NOH,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 20.5,
      seasonId: 2011,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 16.5,
      seasonId: 2011,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 25.5,
      seasonId: 2011,
      teamId: TEAM_CODES.UTA,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 20.5,
      seasonId: 2011,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

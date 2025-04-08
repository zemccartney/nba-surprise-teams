import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2013-04-17",
  id: 2012,
  startDate: "2012-10-30",
  teams: {
    [TEAM_CODES.CHA]: {
      overUnder: 19.5,
      seasonId: 2012,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 31.5,
      seasonId: 2012,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DET]: {
      overUnder: 32.5,
      seasonId: 2012,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 35.5,
      seasonId: 2012,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.HOU]: {
      overUnder: 31.5,
      seasonId: 2012,
      teamId: TEAM_CODES.HOU,
    },
    [TEAM_CODES.NOH]: {
      overUnder: 26.5,
      seasonId: 2012,
      teamId: TEAM_CODES.NOH,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 23.5,
      seasonId: 2012,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.PHX]: {
      overUnder: 33.5,
      seasonId: 2012,
      teamId: TEAM_CODES.PHX,
    },
    [TEAM_CODES.POR]: {
      overUnder: 34.5,
      seasonId: 2012,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 29.5,
      seasonId: 2012,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 32.5,
      seasonId: 2012,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 27.5,
      seasonId: 2012,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

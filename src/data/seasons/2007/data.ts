import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2008-04-16",
  episodeUrl: "",
  id: 2007,
  startDate: "2007-10-30",
  teams: {
    [TEAM_CODES.CHA]: {
      overUnder: 35.5,
      seasonId: 2007,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.IND]: {
      overUnder: 30.5,
      seasonId: 2007,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 30.5,
      seasonId: 2007,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 32.5,
      seasonId: 2007,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 35.5,
      seasonId: 2007,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 19.5,
      seasonId: 2007,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 32.5,
      seasonId: 2007,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.POR]: {
      overUnder: 30.5,
      seasonId: 2007,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 34.5,
      seasonId: 2007,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.SEA]: {
      overUnder: 27.5,
      seasonId: 2007,
      teamId: TEAM_CODES.SEA,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

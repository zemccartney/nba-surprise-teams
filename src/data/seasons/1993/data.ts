import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "1994-04-24",
  id: 1993,
  startDate: "1993-11-05",
  teams: {
    [TEAM_CODES.DAL]: {
      overUnder: 21.5,
      seasonId: 1993,
      teamId: TEAM_CODES.DAL,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 31.5,
      seasonId: 1993,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 25.5,
      seasonId: 1993,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 30.5,
      seasonId: 1993,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 31,
      seasonId: 1993,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 30,
      seasonId: 1993,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

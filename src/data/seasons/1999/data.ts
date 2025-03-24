import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2000-04-19",
  id: 1999,
  startDate: "1999-11-02",
  teams: {
    [TEAM_CODES.CHI]: {
      overUnder: 27.5,
      seasonId: 1999,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.DAL]: {
      overUnder: 30.5,
      seasonId: 1999,
      teamId: TEAM_CODES.DAL,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 31.5,
      seasonId: 1999,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 25.5,
      seasonId: 1999,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 29.5,
      seasonId: 1999,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.SEA]: {
      overUnder: 34.5,
      seasonId: 1999,
      teamId: TEAM_CODES.SEA,
    },
    [TEAM_CODES.VAN]: {
      overUnder: 25.5,
      seasonId: 1999,
      teamId: TEAM_CODES.VAN,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 35.5,
      seasonId: 1999,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2001-04-18",
  id: 2000,
  startDate: "2000-10-31",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 28.5,
      seasonId: 2000,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.BOS]: {
      overUnder: 34.5,
      seasonId: 2000,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 28.5,
      seasonId: 2000,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 34.5,
      seasonId: 2000,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 34.5,
      seasonId: 2000,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.DET]: {
      overUnder: 34.5,
      seasonId: 2000,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 24.5,
      seasonId: 2000,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 19.5,
      seasonId: 2000,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.VAN]: {
      overUnder: 24.5,
      seasonId: 2000,
      teamId: TEAM_CODES.VAN,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 29.5,
      seasonId: 2000,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

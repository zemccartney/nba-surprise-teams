import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2007-04-18",
  id: 2006,
  startDate: "2006-10-31",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 28,
      seasonId: 2006,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.BOS]: {
      overUnder: 35,
      seasonId: 2006,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 32,
      seasonId: 2006,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 35,
      seasonId: 2006,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 30.5,
      seasonId: 2006,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 35.5,
      seasonId: 2006,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.POR]: {
      overUnder: 24,
      seasonId: 2006,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.SEA]: {
      overUnder: 35.5,
      seasonId: 2006,
      teamId: TEAM_CODES.SEA,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 32.5,
      seasonId: 2006,
      teamId: TEAM_CODES.TOR,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

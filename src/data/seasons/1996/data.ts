import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "1997-04-20",
  id: 1996,
  startDate: "1996-11-01",
  teams: {
    [TEAM_CODES.BOS]: {
      overUnder: 28.5,
      seasonId: 1996,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 34,
      seasonId: 1996,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 35.5,
      seasonId: 1996,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 25,
      seasonId: 1996,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 28.5,
      seasonId: 1996,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 26.5,
      seasonId: 1996,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 34,
      seasonId: 1996,
      teamId: TEAM_CODES.NJN,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 23.5,
      seasonId: 1996,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 24,
      seasonId: 1996,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.VAN]: {
      overUnder: 18.5,
      seasonId: 1996,
      teamId: TEAM_CODES.VAN,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

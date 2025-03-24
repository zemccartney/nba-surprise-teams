import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "1998-04-19",
  id: 1997,
  startDate: "1997-10-30",
  teams: {
    [TEAM_CODES.BOS]: {
      overUnder: 30.5,
      seasonId: 1997,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.DAL]: {
      overUnder: 23.5,
      seasonId: 1997,
      teamId: TEAM_CODES.DAL,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 21.5,
      seasonId: 1997,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 25.5,
      seasonId: 1997,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 31.5,
      seasonId: 1997,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 22.5,
      seasonId: 1997,
      teamId: TEAM_CODES.NJN,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 33.5,
      seasonId: 1997,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 24.5,
      seasonId: 1997,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 34.5,
      seasonId: 1997,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.VAN]: {
      overUnder: 20.5,
      seasonId: 1997,
      teamId: TEAM_CODES.VAN,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

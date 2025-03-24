import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2014-04-16",
  id: 2013,
  startDate: "2013-10-29",
  teams: {
    [TEAM_CODES.BOS]: {
      overUnder: 28.5,
      seasonId: 2013,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 26,
      seasonId: 2013,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 28.5,
      seasonId: 2013,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 23.5,
      seasonId: 2013,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 16.5,
      seasonId: 2013,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.PHX]: {
      overUnder: 20.5,
      seasonId: 2013,
      teamId: TEAM_CODES.PHX,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 31.5,
      seasonId: 2013,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 35.5,
      seasonId: 2013,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 26.5,
      seasonId: 2013,
      teamId: TEAM_CODES.UTA,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

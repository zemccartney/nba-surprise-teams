import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2015-04-15",
  episodeUrl: "",
  id: 2014,
  startDate: "2014-10-28",
  teams: {
    [TEAM_CODES.BOS]: {
      overUnder: 27,
      seasonId: 2014,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.IND]: {
      overUnder: 33.5,
      seasonId: 2014,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.LAL]: {
      overUnder: 29,
      seasonId: 2014,
      teamId: TEAM_CODES.LAL,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 24.5,
      seasonId: 2014,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 29,
      seasonId: 2014,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 26.5,
      seasonId: 2014,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 16,
      seasonId: 2014,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 29.5,
      seasonId: 2014,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 27,
      seasonId: 2014,
      teamId: TEAM_CODES.UTA,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2017-04-12",
  id: 2016,
  startDate: "2016-10-25",
  teams: {
    [TEAM_CODES.BKN]: {
      overUnder: 21.5,
      seasonId: 2016,
      teamId: TEAM_CODES.BKN,
    },
    [TEAM_CODES.LAL]: {
      overUnder: 24.5,
      seasonId: 2016,
      teamId: TEAM_CODES.LAL,
    },
    [TEAM_CODES.MIA]: {
      overUnder: 34.5,
      seasonId: 2016,
      teamId: TEAM_CODES.MIA,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 34.5,
      seasonId: 2016,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 23.5,
      seasonId: 2016,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.PHX]: {
      overUnder: 29.5,
      seasonId: 2016,
      teamId: TEAM_CODES.PHX,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 33.5,
      seasonId: 2016,
      teamId: TEAM_CODES.SAC,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

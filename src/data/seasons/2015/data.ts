import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2016-04-13",
  id: 2015,
  startDate: "2015-10-27",
  teams: {
    [TEAM_CODES.BKN]: {
      overUnder: 27.5,
      seasonId: 2015,
      teamId: TEAM_CODES.BKN,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 34,
      seasonId: 2015,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 27.5,
      seasonId: 2015,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.LAL]: {
      overUnder: 28.5,
      seasonId: 2015,
      teamId: TEAM_CODES.LAL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 27.5,
      seasonId: 2015,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 29.5,
      seasonId: 2015,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 34.5,
      seasonId: 2015,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 20.5,
      seasonId: 2015,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.POR]: {
      overUnder: 28.5,
      seasonId: 2015,
      teamId: TEAM_CODES.POR,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

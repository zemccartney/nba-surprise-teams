import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2011-05-26",
  id: 2010,
  startDate: "2010-10-26",
  teams: {
    [TEAM_CODES.CLE]: {
      overUnder: 30.5,
      seasonId: 2010,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DET]: {
      overUnder: 30.5,
      seasonId: 2010,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 30.5,
      seasonId: 2010,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.IND]: {
      overUnder: 33.5,
      seasonId: 2010,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 23.5,
      seasonId: 2010,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 24.5,
      seasonId: 2010,
      teamId: TEAM_CODES.NJN,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 35.5,
      seasonId: 2010,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.PHI]: {
      overUnder: 34.5,
      seasonId: 2010,
      teamId: TEAM_CODES.PHI,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 27.5,
      seasonId: 2010,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 26.5,
      seasonId: 2010,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 32.5,
      seasonId: 2010,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

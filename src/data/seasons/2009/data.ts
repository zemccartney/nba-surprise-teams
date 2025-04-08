import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2010-04-14",
  id: 2009,
  startDate: "2009-10-27",
  teams: {
    [TEAM_CODES.GSW]: {
      overUnder: 34.5,
      seasonId: 2009,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.HOU]: {
      overUnder: 35.5,
      seasonId: 2009,
      teamId: TEAM_CODES.HOU,
    },
    [TEAM_CODES.IND]: {
      overUnder: 34.5,
      seasonId: 2009,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 34.5,
      seasonId: 2009,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 27.5,
      seasonId: 2009,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 26.5,
      seasonId: 2009,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 26.5,
      seasonId: 2009,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 27.5,
      seasonId: 2009,
      teamId: TEAM_CODES.NJN,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 31.5,
      seasonId: 2009,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.OKC]: {
      overUnder: 33.5,
      seasonId: 2009,
      teamId: TEAM_CODES.OKC,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 24.5,
      seasonId: 2009,
      teamId: TEAM_CODES.SAC,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

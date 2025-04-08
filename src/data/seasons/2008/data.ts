import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2009-05-30",
  id: 2008,
  startDate: "2008-10-28",
  teams: {
    [TEAM_CODES.IND]: {
      overUnder: 35.5,
      seasonId: 2008,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 34.5,
      seasonId: 2008,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 22.5,
      seasonId: 2008,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 30.5,
      seasonId: 2008,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 30.5,
      seasonId: 2008,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 27.5,
      seasonId: 2008,
      teamId: TEAM_CODES.NJN,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 32.5,
      seasonId: 2008,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.OKC]: {
      overUnder: 25.5,
      seasonId: 2008,
      teamId: TEAM_CODES.OKC,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 28.5,
      seasonId: 2008,
      teamId: TEAM_CODES.SAC,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

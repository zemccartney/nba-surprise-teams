import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2004-04-14",
  id: 2003,
  startDate: "2003-10-28",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 33,
      seasonId: 2003,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 29.5,
      seasonId: 2003,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 27.5,
      seasonId: 2003,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 31.5,
      seasonId: 2003,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 30.5,
      seasonId: 2003,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 31.5,
      seasonId: 2003,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.MIA]: {
      overUnder: 35,
      seasonId: 2003,
      teamId: TEAM_CODES.MIA,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 31.5,
      seasonId: 2003,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 33.5,
      seasonId: 2003,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 25.5,
      seasonId: 2003,
      teamId: TEAM_CODES.UTA,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 29.5,
      seasonId: 2003,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

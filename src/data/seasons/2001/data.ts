import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2002-04-17",
  id: 2001,
  startDate: "2001-10-30",
  teams: {
    [TEAM_CODES.BOS]: {
      overUnder: 35.5,
      seasonId: 2001,
      teamId: TEAM_CODES.BOS,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 18.5,
      seasonId: 2001,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 26.5,
      seasonId: 2001,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 27.5,
      seasonId: 2001,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.DET]: {
      overUnder: 30.5,
      seasonId: 2001,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 23.5,
      seasonId: 2001,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 19.5,
      seasonId: 2001,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.NJN]: {
      overUnder: 35.5,
      seasonId: 2001,
      teamId: TEAM_CODES.NJN,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2003-04-16",
  id: 2002,
  startDate: "2002-10-29",
  teams: {
    [TEAM_CODES.CHI]: {
      overUnder: 30,
      seasonId: 2002,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 23.5,
      seasonId: 2002,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DEN]: {
      overUnder: 19.5,
      seasonId: 2002,
      teamId: TEAM_CODES.DEN,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 25,
      seasonId: 2002,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 30,
      seasonId: 2002,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.MIA]: {
      overUnder: 35,
      seasonId: 2002,
      teamId: TEAM_CODES.MIA,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 29.5,
      seasonId: 2002,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.PHX]: {
      overUnder: 35.5,
      seasonId: 2002,
      teamId: TEAM_CODES.PHX,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

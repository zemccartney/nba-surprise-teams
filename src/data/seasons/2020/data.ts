import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2021-05-16",
  id: 2020,
  shortened: {
    numGames: 72,
    reason:
      "Season pushed back and shortened as part of league's COVID response",
  },
  startDate: "2020-12-22",
  teams: {
    [TEAM_CODES.CHA]: {
      overUnder: 26.5,
      seasonId: 2020,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 29.5,
      seasonId: 2020,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 22.5,
      seasonId: 2020,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DET]: {
      overUnder: 23.5,
      seasonId: 2020,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 31.5,
      seasonId: 2020,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 29.5,
      seasonId: 2020,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 21.5,
      seasonId: 2020,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.OKC]: {
      overUnder: 22.5,
      seasonId: 2020,
      teamId: TEAM_CODES.OKC,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 31.5,
      seasonId: 2020,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 28.5,
      seasonId: 2020,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.SAS]: {
      overUnder: 28.5,
      seasonId: 2020,
      teamId: TEAM_CODES.SAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

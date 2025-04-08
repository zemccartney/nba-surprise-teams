import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2019-04-10",
  id: 2018,
  startDate: "2018-10-16",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 23.5,
      seasonId: 2018,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.BKN]: {
      overUnder: 32,
      seasonId: 2018,
      teamId: TEAM_CODES.BKN,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 35.5,
      seasonId: 2018,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 30,
      seasonId: 2018,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.CLE]: {
      overUnder: 30.5,
      seasonId: 2018,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DAL]: {
      overUnder: 35.5,
      seasonId: 2018,
      teamId: TEAM_CODES.DAL,
    },
    [TEAM_CODES.MEM]: {
      overUnder: 34.5,
      seasonId: 2018,
      teamId: TEAM_CODES.MEM,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 28.5,
      seasonId: 2018,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 31,
      seasonId: 2018,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.PHX]: {
      overUnder: 29,
      seasonId: 2018,
      teamId: TEAM_CODES.PHX,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 26,
      seasonId: 2018,
      teamId: TEAM_CODES.SAC,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

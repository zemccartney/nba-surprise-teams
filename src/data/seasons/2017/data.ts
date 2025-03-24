import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2018-04-11",
  id: 2017,
  startDate: "2017-10-17",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 25.5,
      seasonId: 2017,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.BKN]: {
      overUnder: 27.5,
      seasonId: 2017,
      teamId: TEAM_CODES.BKN,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 22,
      seasonId: 2017,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.DAL]: {
      overUnder: 35.5,
      seasonId: 2017,
      teamId: TEAM_CODES.DAL,
    },
    [TEAM_CODES.IND]: {
      overUnder: 31.5,
      seasonId: 2017,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.LAL]: {
      overUnder: 33.5,
      seasonId: 2017,
      teamId: TEAM_CODES.LAL,
    },
    [TEAM_CODES.NYK]: {
      overUnder: 30.5,
      seasonId: 2017,
      teamId: TEAM_CODES.NYK,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 33.5,
      seasonId: 2017,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.PHX]: {
      overUnder: 28.5,
      seasonId: 2017,
      teamId: TEAM_CODES.PHX,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 27.5,
      seasonId: 2017,
      teamId: TEAM_CODES.SAC,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

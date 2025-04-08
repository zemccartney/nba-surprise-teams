import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2006-04-19",
  id: 2005,
  startDate: "2005-11-01",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 21.5,
      seasonId: 2005,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 21,
      seasonId: 2005,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.MIL]: {
      overUnder: 35.5,
      seasonId: 2005,
      teamId: TEAM_CODES.MIL,
    },
    [TEAM_CODES.NOK]: {
      overUnder: 21.5,
      seasonId: 2005,
      teamId: TEAM_CODES.NOK,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 34.5,
      seasonId: 2005,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.POR]: {
      overUnder: 28.5,
      seasonId: 2005,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 28.5,
      seasonId: 2005,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 34,
      seasonId: 2005,
      teamId: TEAM_CODES.UTA,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

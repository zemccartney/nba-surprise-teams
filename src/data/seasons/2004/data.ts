import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2005-04-20",
  id: 2004,
  startDate: "2004-11-02",
  teams: {
    [TEAM_CODES.ATL]: {
      overUnder: 27.5,
      seasonId: 2004,
      teamId: TEAM_CODES.ATL,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 16.5,
      seasonId: 2004,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 32.5,
      seasonId: 2004,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.GSW]: {
      overUnder: 35.5,
      seasonId: 2004,
      teamId: TEAM_CODES.GSW,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 32.5,
      seasonId: 2004,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.NOH]: {
      overUnder: 30.5,
      seasonId: 2004,
      teamId: TEAM_CODES.NOH,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 34.5,
      seasonId: 2004,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.SEA]: {
      overUnder: 34.5,
      seasonId: 2004,
      teamId: TEAM_CODES.SEA,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 34.5,
      seasonId: 2004,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 33.5,
      seasonId: 2004,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

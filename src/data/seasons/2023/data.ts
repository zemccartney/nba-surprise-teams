import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2024-04-14",
  episodeUrl:
    "https://podcasts.apple.com/us/podcast/the-athletic-nba-daily/id1358187061?i=1000632020041",
  id: 2023,
  startDate: "2023-10-24",
  teams: {
    [TEAM_CODES.CHA]: {
      overUnder: 31.5,
      seasonId: 2023,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.DET]: {
      overUnder: 28.5,
      seasonId: 2023,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.HOU]: {
      overUnder: 31.5,
      seasonId: 2023,
      teamId: TEAM_CODES.HOU,
    },
    [TEAM_CODES.POR]: {
      overUnder: 28.5,
      seasonId: 2023,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.SAS]: {
      overUnder: 28.5,
      seasonId: 2023,
      teamId: TEAM_CODES.SAS,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 35.5,
      seasonId: 2023,
      teamId: TEAM_CODES.UTA,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 24.5,
      seasonId: 2023,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

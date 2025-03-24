import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2022-04-10",
  episodeUrl:
    "https://podcasts.apple.com/us/podcast/the-athletic-nba-daily/id1358187061?i=1000538054337",
  id: 2021,
  startDate: "2021-10-19",
  teams: {
    [TEAM_CODES.CLE]: {
      overUnder: 26.5,
      seasonId: 2021,
      teamId: TEAM_CODES.CLE,
    },
    [TEAM_CODES.DET]: {
      overUnder: 24.5,
      seasonId: 2021,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.HOU]: {
      overUnder: 27.5,
      seasonId: 2021,
      teamId: TEAM_CODES.HOU,
    },
    [TEAM_CODES.MIN]: {
      overUnder: 35.5,
      seasonId: 2021,
      teamId: TEAM_CODES.MIN,
    },
    [TEAM_CODES.OKC]: {
      overUnder: 23.5,
      seasonId: 2021,
      teamId: TEAM_CODES.OKC,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 22.5,
      seasonId: 2021,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.SAS]: {
      overUnder: 28.5,
      seasonId: 2021,
      teamId: TEAM_CODES.SAS,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 33.5,
      seasonId: 2021,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

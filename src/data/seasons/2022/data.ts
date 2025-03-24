import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2023-04-09",
  episodeUrl:
    "https://podcasts.apple.com/us/podcast/surprise-team-pacers-tanking/id1358187061?i=1000581134874",
  id: 2022,
  startDate: "2022-10-18",
  teams: {
    [TEAM_CODES.DET]: {
      overUnder: 29.5,
      seasonId: 2022,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.HOU]: {
      overUnder: 23.5,
      seasonId: 2022,
      teamId: TEAM_CODES.HOU,
    },
    [TEAM_CODES.IND]: {
      overUnder: 24.5,
      seasonId: 2022,
      teamId: TEAM_CODES.IND,
    },
    [TEAM_CODES.OKC]: {
      overUnder: 23.5,
      seasonId: 2022,
      teamId: TEAM_CODES.OKC,
    },
    [TEAM_CODES.ORL]: {
      overUnder: 26.5,
      seasonId: 2022,
      teamId: TEAM_CODES.ORL,
    },
    [TEAM_CODES.SAC]: {
      overUnder: 34.5,
      seasonId: 2022,
      teamId: TEAM_CODES.SAC,
    },
    [TEAM_CODES.SAS]: {
      overUnder: 22.5,
      seasonId: 2022,
      teamId: TEAM_CODES.SAS,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 25.5,
      seasonId: 2022,
      teamId: TEAM_CODES.UTA,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 35.5,
      seasonId: 2022,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

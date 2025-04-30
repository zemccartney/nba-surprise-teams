import type { SeasonData } from "../../types";

import * as Utils from "../../../utils";
import { TEAM_CODES } from "../../constants";

const seasonData = {
  endDate: "2025-04-13",
  episodeUrl:
    "https://podcasts.apple.com/us/podcast/embiid-extension-surprise-teams-pelicans-preview/id1358187061?i=1000670194276",
  id: 2024,
  startDate: "2024-10-22",
  teams: {
    [TEAM_CODES.BKN]: {
      overUnder: 19.5,
      seasonId: 2024,
      teamId: TEAM_CODES.BKN,
    },
    [TEAM_CODES.CHA]: {
      overUnder: 30.5,
      seasonId: 2024,
      teamId: TEAM_CODES.CHA,
    },
    [TEAM_CODES.CHI]: {
      overUnder: 28.5,
      seasonId: 2024,
      teamId: TEAM_CODES.CHI,
    },
    [TEAM_CODES.DET]: {
      overUnder: 25.5,
      seasonId: 2024,
      teamId: TEAM_CODES.DET,
    },
    [TEAM_CODES.LAC]: {
      overUnder: 35.5,
      seasonId: 2024,
      teamId: TEAM_CODES.LAC,
    },
    [TEAM_CODES.POR]: {
      overUnder: 21.5,
      seasonId: 2024,
      teamId: TEAM_CODES.POR,
    },
    [TEAM_CODES.TOR]: {
      overUnder: 29.5,
      seasonId: 2024,
      teamId: TEAM_CODES.TOR,
    },
    [TEAM_CODES.UTA]: {
      overUnder: 28.5,
      seasonId: 2024,
      teamId: TEAM_CODES.UTA,
    },
    [TEAM_CODES.WAS]: {
      overUnder: 20.5,
      seasonId: 2024,
      teamId: TEAM_CODES.WAS,
    },
  },
} satisfies SeasonData;

export default Utils.deepFreeze(seasonData);

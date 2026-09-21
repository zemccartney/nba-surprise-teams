export interface SurprisesByTeamChartProps {
  data: TeamChartPoint[];
}

/**
Renderer-neutral payloads serialized by Astro; no runtime or asset imports.
*/
export interface SurprisesPerSeasonChartProps {
  data: {
    numSurprises: number;
    seasonId: string;
    seasonRange: string;
    surpriseTeams: { logoSrc: string; name: string; teamId: string }[];
  }[];
  latestSeasonYear: number;
}

export type TeamChartPoint = (
  | {
      history: {
        duration: [number, number?];
        logoSrc: string;
        name: string;
        teamId: string;
      }[];
    }
  | { logoSrc?: string }
) & {
  name: string;
  numEliminated: number;
  numSurprised: number;
  teamId: string;
};

/**
The Astro wrapper resolves the emoji URL without pulling assets into client JS.
*/
export interface TeamSeasonPaceChartData extends TeamSeasonPaceChartProps {
  surprisedEmojiSrc: string;
}

export interface TeamSeasonPaceChartProps {
  data: {
    date: string;
    pace: number;
    projectedWins: number;
    recordFmt: string;
  }[];
  surpriseRules: {
    numGames: number;
    overUnderCutoff: number;
    paceTarget: number;
  };
  winsToSurprise: number;
}

export interface TeamSeasonScatterplotProps {
  data: {
    isSurpriseTeam: boolean;
    logoSrc: string;
    overUnder: number;
    pace: number;
    recordFmt: string;
    seasonRange: string;
    teamName: string;
  }[];
}

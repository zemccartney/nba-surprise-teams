import { TEAM_CODES } from "./constants";

export interface Game {
  id: string; // {{yyyymmdd}}/{{teamA}}__{{teamZ}} ; see SeasonUtils.formatGameId
  playedOn: string;
  seasonId: SeasonId;
  // Aimed at properly handling neutral site games, like Miami vs. WAS 11/2/2024 (MEX) or ATL vs. MIL (Cup, LV)
  // live loader sets one to home, one to away; archive loader represents each team as the away team
  teams: [TeamScore, TeamScore];
}

export interface Season {
  endDate: string;
  episodeUrl?: string;
  id: SeasonId;
  shortened?: {
    numGames: number;
    reason: string;
  };
  startDate: string;
}

// TODO Has to be a less shitty way to do this
// intent is to flag data issues on entry
export type SeasonData = (Season & {
  teams: unknown; // require implementation of property by season
}) &
  (
    | {
        id: 1993;
        teams: Record<
          | typeof TEAM_CODES.DAL
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 1993 }
        >;
      }
    | {
        id: 1996;
        teams: Record<
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NJN
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.VAN,
          TeamSeason & { seasonId: 1996 }
        >;
      }
    | {
        id: 1997;
        teams: Record<
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.DAL
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.NJN
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.VAN,
          TeamSeason & { seasonId: 1997 }
        >;
      }
    | {
        id: 1999;
        teams: Record<
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.DAL
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.SEA
          | typeof TEAM_CODES.VAN
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 1999 }
        >;
      }
    | {
        id: 2000;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.VAN
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2000 }
        >;
      }
    | {
        id: 2001;
        teams: Record<
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.NJN,
          TeamSeason & { seasonId: 2001 }
        >;
      }
    | {
        id: 2002;
        teams: Record<
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.MIA
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.PHX,
          TeamSeason & { seasonId: 2002 }
        >;
      }
    | {
        id: 2003;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.MIA
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2003 }
        >;
      }
    | {
        id: 2004;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.NOH
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.SEA
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2004 }
        >;
      }
    | {
        id: 2005;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.NOK
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.UTA,
          TeamSeason & { seasonId: 2005 }
        >;
      }
    | {
        id: 2006;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.SEA
          | typeof TEAM_CODES.TOR,
          TeamSeason & { seasonId: 2006 }
        >;
      }
    | {
        id: 2007;
        teams: Record<
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.SEA,
          TeamSeason & { seasonId: 2007 }
        >;
      }
    | {
        id: 2008;
        teams: Record<
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NJN
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.SAC,
          TeamSeason & { seasonId: 2008 }
        >;
      }
    | {
        id: 2009;
        teams: Record<
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NJN
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.SAC,
          TeamSeason & { seasonId: 2009 }
        >;
      }
    | {
        id: 2010;
        teams: Record<
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NJN
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2010 }
        >;
      }
    | {
        id: 2011;
        teams: Record<
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NJN
          | typeof TEAM_CODES.NOH
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2011 }
        >;
      }
    | {
        id: 2012;
        teams: Record<
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.GSW
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.NOH
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.PHX
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2012 }
        >;
      }
    | {
        id: 2013;
        teams: Record<
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.PHX
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.UTA,
          TeamSeason & { seasonId: 2013 }
        >;
      }
    | {
        id: 2014;
        teams: Record<
          | typeof TEAM_CODES.BOS
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.LAL
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.UTA,
          TeamSeason & { seasonId: 2014 }
        >;
      }
    | {
        id: 2015;
        teams: Record<
          | typeof TEAM_CODES.BKN
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.DEN
          | typeof TEAM_CODES.LAL
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.POR,
          TeamSeason & { seasonId: 2015 }
        >;
      }
    | {
        id: 2016;
        teams: Record<
          | typeof TEAM_CODES.BKN
          | typeof TEAM_CODES.LAL
          | typeof TEAM_CODES.MIA
          | typeof TEAM_CODES.MIL
          | typeof TEAM_CODES.PHI
          | typeof TEAM_CODES.PHX
          | typeof TEAM_CODES.SAC,
          TeamSeason & { seasonId: 2016 }
        >;
      }
    | {
        id: 2017;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.BKN
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.DAL
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.LAL
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.PHX
          | typeof TEAM_CODES.SAC,
          TeamSeason & { seasonId: 2017 }
        >;
      }
    | {
        id: 2018;
        teams: Record<
          | typeof TEAM_CODES.ATL
          | typeof TEAM_CODES.BKN
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DAL
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.PHX
          | typeof TEAM_CODES.SAC,
          TeamSeason & { seasonId: 2018 }
        >;
      }
    | {
        id: 2020;
        teams: Record<
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.MEM
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.NYK
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.SAS,
          TeamSeason & { seasonId: 2020 }
        >;
      }
    | {
        id: 2021;
        teams: Record<
          | typeof TEAM_CODES.CLE
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.MIN
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.SAS
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2021 }
        >;
      }
    | {
        id: 2022;
        teams: Record<
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.IND
          | typeof TEAM_CODES.OKC
          | typeof TEAM_CODES.ORL
          | typeof TEAM_CODES.SAC
          | typeof TEAM_CODES.SAS
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2022 }
        >;
      }
    | {
        id: 2023;
        teams: Record<
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.HOU
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.SAS
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2023 }
        >;
      }
    | {
        id: 2024;
        teams: Record<
          | typeof TEAM_CODES.BKN
          | typeof TEAM_CODES.CHA
          | typeof TEAM_CODES.CHI
          | typeof TEAM_CODES.DET
          | typeof TEAM_CODES.LAC
          | typeof TEAM_CODES.POR
          | typeof TEAM_CODES.TOR
          | typeof TEAM_CODES.UTA
          | typeof TEAM_CODES.WAS,
          TeamSeason & { seasonId: 2024 }
        >;
      }
  );

// Represents the opening date year of the season e.g. 2024 if 24-25 season
export type SeasonId =
  | 1993
  | 1996
  | 1997
  | 1999
  | 2000
  | 2001
  | 2002
  | 2003
  | 2004
  | 2005
  | 2006
  | 2007
  | 2008
  | 2009
  | 2010
  | 2011
  | 2012
  | 2013
  | 2014
  | 2015
  | 2016
  | 2017
  | 2018
  | 2020
  | 2021
  | 2022
  | 2023
  | 2024;

export interface Team {
  alternativeNames?: {
    duration: [SeasonId, SeasonId];
    logo: string;
    name: string;
  }[];
  id: TeamCode;
  name: string;
}

// https://www.totaltypescript.com/books/total-typescript-essentials/deriving-types#using-as-const-for-javascript-style-enums
export type TeamCode = (typeof TEAM_CODES)[keyof typeof TEAM_CODES];

// TeamRecord and TeamStats are utility types, conventions for formatting game data and coalescing w/ team / season
// data to facilitate common calculations
export interface TeamRecord {
  l: number;
  w: number;
}

export interface TeamScore {
  score: number;
  teamId: TeamCode;
}

export interface TeamSeason {
  overUnder: number;
  seasonId: Season["id"];
  teamId: Team["id"];
}

export interface TeamStats extends TeamSeason {
  record: TeamRecord;
}

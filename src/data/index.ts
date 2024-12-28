export const TEAMS: Record<string, { name: string }> = {
  ATL: {
    name: "Atlanta Hawks",
  },
  BKN: {
    name: "Brooklyn Nets",
  },
  CHA: {
    name: "Charlotte Hornets",
  },
  CHI: {
    name: "Chicago Bulls",
  },
  DET: {
    name: "Detroit Pistons",
  },
  POR: {
    name: "Portland Trail Blazers",
  },
  TOR: {
    name: "Toronto Raptors",
  },
  UTA: {
    name: "Utah Jazz",
  },
  WAS: {
    name: "Washington Wizards",
  },
} as const;

export const TeamCodes = Object.keys(TEAMS);

export type TeamCodeType = keyof typeof TEAMS;

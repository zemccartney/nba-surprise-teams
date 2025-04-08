/*

Used for inspecting data, in case issues with parsing / storing
Please don't judge me on this :) nothing here is written with quality in mind,
solely for experimentation and evaluation

*/

import Fs from "node:fs/promises";
import Path from "node:path";
import Url from "node:url";

const __filename = Url.fileURLToPath(import.meta.url);
const projectRoot = Path.dirname(__filename);

const seasonsDir = await Fs.readdir(Path.join(projectRoot, "src/data/seasons"));

const seasons = seasonsDir
  .filter((entry) => entry !== "index.ts")
  .map((season) => Number.parseInt(season, 10));

const teams = new Set();
const names = {};

const gim = async (seasonId) => {
  const params = new URLSearchParams({
    Counter: 0,
    DateFrom: "",
    DateTo: "",
    Direction: "ASC",
    LeagueID: "00",
    PlayerOrTeam: "T",
    Season: seasonId,
    SeasonType: "Regular Season",
    Sorter: "DATE",
  });

  const res = await fetch(
    // https://github.com/swar/nba_api/blob/19b6665b624d65614f98831d2dfa39c9035456b2/docs/nba_api/stats/endpoints/leaguegamelog.md
    "https://stats.nba.com/stats/leaguegamelog?" + params.toString(),
    {
      // On experimenting, key to working is Referer; stops working on removal
      // I assume due to https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy#strict-origin-when-cross-origin_2
      headers: {
        // https://github.com/swar/nba_api/blob/8897889ad2bcded6b8a4ee014e752fca6f2581b3/src/nba_api/stats/library/http.py
        Referer: "https://stats.nba.com/",
      },
      // Timeout maybe too high, potentially revisit. Intuition: don't make user wait too long if response hanging, but enough leeway to account for uncertain latency
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    throw new Error(`NBA API request failed: ${res.status}`);
  }

  const result = await res.json();

  const fIdx = {};

  for (let i = 0; i < result.resultSets[0].headers.length; i++) {
    const header = result.resultSets[0].headers[i];
    if (
      header && // making ts happy
      [
        "GAME_DATE",
        "MATCHUP",
        "PTS",
        "TEAM_ABBREVIATION",
        "TEAM_NAME",
      ].includes(header)
    ) {
      fIdx[header] = i;
    }
  }

  for (const game of result.resultSets[0].rowSet) {
    teams.add(game[fIdx.TEAM_ABBREVIATION]);
    names[game[fIdx.TEAM_ABBREVIATION]] ??= new Set();
    names[game[fIdx.TEAM_ABBREVIATION]].add(game[fIdx.TEAM_NAME]);
  }
};

const batches = [];
while (seasons.length > 0) {
  batches.push(seasons.splice(0, 4));
}

for (const batch of batches) {
  await Promise.all(batch.map((sid) => gim(sid)));
}
/*
sometimes the api stops responding, seems to be 
some sort of rate limiting, maybe?

await gim(2024);
await gim(2023);
await gim(2022);
await gim(2021);
await gim(2020);
await gim(2019);
await gim(2018);
await gim(2017);
await gim(2016);
await gim(2015);
await gim(2014);
await gim(2013);
await gim(2012);
await gim(2011);
await gim(2010);
await gim(2009);


await gim(2008);
await gim(2007);
await gim(2006);
await gim(2005);

await gim(2004);
await gim(2003);
await gim(2002);
await gim(2001);


await gim(2000);

await gim(1999);

await gim(1997);

await gim(1996);

await gim(1993);
*/

console.log(
  [...teams].toSorted((t1, t2) => t1.localeCompare(t2)),
  Object.fromEntries(
    Object.entries(names).map(([k, teams]) => [k, [...teams]]),
  ),
);

// canonical
const x = {
  ATL: "Atlanta Hawks",
  BKN: "Brooklyn Nets",
  BOS: "Boston Celtics",
  CHA: "Charlotte Hornets",
  CHH: "Charlotte Hornets",
  CHI: "Chicago Bulls",
  CLE: "Cleveland Cavaliers",
  DAL: "Dallas Mavericks",
  DEN: "Denver Nuggets",
  DET: "Detroit Pistons",
  GOS: "Golden State Warriors",
  GSW: "Golden State Warriors",
  HOU: "Houston Rockets",
  IND: "Indiana Pacers",
  LAC: "LA Clippers",
  LAL: "Los Angeles Lakers",
  MEM: "Memphis Grizzlies",
  MIA: "Miami Heat",
  MIL: "Milwaukee Bucks",
  MIN: "Minnesota Timberwolves",
  NJN: "New Jersey Nets",
  NOH: "New Orleans Hornets",
  NOK: "New Orleans/Oklahoma City Hornets",
  NOP: "New Orleans Pelicans",
  NYK: "New York Knicks",
  OKC: "Oklahoma City Thunder",
  ORL: "Orlando Magic",
  PHI: "Philadelphia 76ers",
  PHL: "Philadelphia 76ers",
  PHX: "Phoenix Suns",
  POR: "Portland Trail Blazers",
  SAC: "Sacramento Kings",
  SAN: "San Antonio Spurs",
  SAS: "San Antonio Spurs",
  SEA: "Seattle SuperSonics",
  TOR: "Toronto Raptors",
  UTA: "Utah Jazz",
  UTH: "Utah Jazz",
  VAN: "Vancouver Grizzlies",
  WAS: "Washington Wizards",
};

// 93 - '08

// correct team code to parse out all data relevant, account for varying codes for same team
// given the same code, adjust team display depending on year
// for insights, group team codes if they represent the same team in history
const LEGACY = {
  CHH: ["Charlotte Hornets"], //
  GOS: ["Golden State Warriors"], //
  PHL: ["Philadelphia 76ers"], // only in 93 and 96, in both of which philly is a surprise team candidate
  SAN: ["San Antonio Spurs"], //
  UTH: ["Utah Jazz"], //
};

const s = {
  ATL: ["Atlanta Hawks"],
  BKN: ["Brooklyn Nets"],
  BOS: ["Boston Celtics"],
  CHA: ["Charlotte Hornets", "Charlotte Bobcats"], //
  CHH: ["Charlotte Hornets"], //
  CHI: ["Chicago Bulls"],
  CLE: ["Cleveland Cavaliers"],
  DAL: ["Dallas Mavericks"],
  DEN: ["Denver Nuggets"],
  DET: ["Detroit Pistons"],
  GOS: ["Golden State Warriors"], //
  GSW: ["Golden State Warriors"],
  HOU: ["Houston Rockets"],
  IND: ["Indiana Pacers"],
  LAC: ["Los Angeles Clippers"],
  LAL: ["Los Angeles Lakers"],
  MEM: ["Memphis Grizzlies"],
  MIA: ["Miami Heat"],
  MIL: ["Milwaukee Bucks"],
  MIN: ["Minnesota Timberwolves"],
  NJN: ["New Jersey Nets"], //
  NOH: ["New Orleans Hornets"], //
  NOK: ["New Orleans/Oklahoma City Hornets"], //
  NOP: ["New Orleans Pelicans"],
  NYK: ["New York Knicks"],
  OKC: ["Oklahoma City Thunder"],
  ORL: ["Orlando Magic"],
  PHI: ["Philadelphia 76ers"], //
  PHL: ["Philadelphia 76ers"], // only in 93 and 96, in both of which philly is a surprise team candidate
  PHX: ["Phoenix Suns"],
  POR: ["Portland Trail Blazers"],
  SAC: ["Sacramento Kings"],
  SAN: ["San Antonio Spurs"], //
  SAS: ["San Antonio Spurs"], //
  SEA: ["Seattle SuperSonics"],
  TOR: ["Toronto Raptors"],
  UTA: ["Utah Jazz"],
  UTH: ["Utah Jazz"], //
  VAN: ["Vancouver Grizzlies"], //
  WAS: ["Washington Wizards", "Washington Bullets"], //
};

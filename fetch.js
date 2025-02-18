console.log("STARTING");

const params = new URLSearchParams({
  Counter: 0,
  Direction: "ASC",
  LeagueID: "00",
  PlayerOrTeam: "T",
  Season: "2024",
  SeasonType: "Regular Season",
  Sorter: "DATE",
  DateFrom: "",
  DateTo: "",
}).toString();

const data = await fetch(
  "https://stats.nba.com/stats/leaguegamelog?" + params,
  {
    // On experimenting, key to working is Referer; stops working on removal
    // TODO What does the Referer header even do?
    headers: {
      Host: "stats.nba.com",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      "x-nba-stats-origin": "stats",
      "x-nba-stats-token": "true",
      Connection: "keep-alive",
      Referer: "https://stats.nba.com/",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
  },
);

const json = await data.json();

console.log(json, json.resultSets[0].rowSet.length);

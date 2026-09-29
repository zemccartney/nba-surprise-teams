async function fn() {
  const res = await fetch(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    {
      headers: {
        Accept: "application/json",
        Referer: "https://www.nba.com/",
      },
      // Timeout maybe too high, potentially revisit. Intuition: don't make user wait too long if response hanging, but enough leeway to account for uncertain latency
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    throw new Error(`NBA CDN request failed: ${res.status}`);
  }

  const result = await res.json();

  console.log(
    new Set(
      result.leagueSchedule.gameDates
        .flatMap(({ games }) => games)
        .filter(({ gameId }) => !gameId.startsWith("002"))
        .map(({ gameId }) => gameId.slice(0, 3)),
    ),
  );
  console.log(
    result.leagueSchedule.gameDates
      .flatMap(({ games }) => games)
      .filter(({ gameId }) => gameId.startsWith("006")),
  );
  //console.log(result.leagueSchedule.gameDates.flatMap(({ games }) => games).filter(({ gameId }) => gameId.startsWith('001')))
  //console.log(result.leagueSchedule.gameDates.flatMap(({ games }) => games).filter(({ gameId }) => gameId.startsWith('002')).length)
}

await fn();

import Fs from "node:fs/promises";
import { parseArgs } from "node:util";

import {
  CUP_CHAMPIONSHIP_PREFIX,
  NBA_SCHEDULE_HEADERS,
  NBA_SCHEDULE_URL,
} from "../src/loaders/live/utils.ts";

interface GameObservation {
  away: unknown;
  awayScore: number;
  date: unknown;
  home: unknown;
  homeScore: number;
  id: string;
  label: unknown;
  seriesText: unknown;
  startUTC: unknown;
  status: unknown;
  statusText: unknown;
  subLabel: unknown;
  subtype: unknown;
}

// These are observations to revisit, not an authoritative NBA specification.
const OBSERVED_PREFIXES = new Set(["001", "002", CUP_CHAMPIONSHIP_PREFIX]);
const OBSERVED_STATUSES = new Set([1, 2, 3]);

const asObject = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }

  return value as Record<string, unknown>;
};

const countValues = (values: string[]) => {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.fromEntries(counts);
};

// Normalize only what the report needs. Unknown labels/statuses remain visible
// for investigation; do not run them through the application's result filter.
const readGame = (
  value: unknown,
  date: unknown,
  errors: string[],
): GameObservation | undefined => {
  const game = asObject(value);
  const home = asObject(game?.homeTeam);
  const away = asObject(game?.awayTeam);

  if (
    !game ||
    typeof game.gameId !== "string" ||
    game.gameId.length === 0 ||
    typeof home?.score !== "number" ||
    !Number.isFinite(home.score) ||
    typeof away?.score !== "number" ||
    !Number.isFinite(away.score)
  ) {
    errors.push(`Malformed game in ${String(date)}`);
    return;
  }

  return {
    away: away.teamTricode,
    awayScore: away.score,
    date,
    home: home.teamTricode,
    homeScore: home.score,
    id: game.gameId,
    label: game.gameLabel,
    seriesText: game.seriesText,
    startUTC: game.gameDateTimeUTC,
    status: game.gameStatus,
    statusText: game.gameStatusText,
    subLabel: game.gameSubLabel,
    subtype: game.gameSubtype,
  };
};

const collectGames = (slates: unknown[], errors: string[]) => {
  const games: GameObservation[] = [];

  for (const value of slates) {
    const slate = asObject(value);

    if (!slate || !Array.isArray(slate.games)) {
      errors.push("Malformed date slate");
      continue;
    }

    for (const entry of slate.games) {
      const game = readGame(entry, slate.gameDate, errors);

      if (game) {
        games.push(game);
      }
    }
  }

  return games;
};

const inspectIdentity = (
  game: GameObservation,
  seasonStartYear: number | undefined,
  warnings: string[],
) => {
  if (!/^\d{10}$/.test(game.id)) {
    warnings.push(`${game.id}: unfamiliar ID format`);
  }

  const prefix = game.id.slice(0, 3);

  if (!OBSERVED_PREFIXES.has(prefix)) {
    warnings.push(
      `${game.id}: prefix outside our preseason/regular/Cup theory`,
    );
  }

  const expectedYearDigits = String(seasonStartYear).slice(-2);
  const isMatchesSeasonYear = game.id.slice(3, 5) === expectedYearDigits;

  if (seasonStartYear !== undefined && !isMatchesSeasonYear) {
    warnings.push(`${game.id}: ID year differs from season-start year`);
  }
};

const startTime = (game: GameObservation) => {
  if (typeof game.startUTC !== "string") {
    return NaN;
  }

  return Date.parse(game.startUTC);
};

const inspectTiming = (
  game: GameObservation,
  seasonStartYear: number | undefined,
  warnings: string[],
) => {
  const start = startTime(game);

  if (!Number.isFinite(start)) {
    warnings.push(`${game.id}: missing/invalid start time (possibly TBD)`);
    return;
  }

  if (seasonStartYear === undefined) {
    return;
  }

  const gameYear = new Date(start).getUTCFullYear();
  const isWithinSeasonYears =
    gameYear >= seasonStartYear && gameYear <= seasonStartYear + 1;

  if (!isWithinSeasonYears) {
    warnings.push(`${game.id}: game date outside season's calendar years`);
  }
};

const inspectStatus = (game: GameObservation, warnings: string[]) => {
  const isKnownStatus =
    typeof game.status === "number" && OBSERVED_STATUSES.has(game.status);
  const hasAnyScore = game.homeScore > 0 || game.awayScore > 0;
  const hasZeroScore = game.homeScore === 0 || game.awayScore === 0;

  if (!isKnownStatus) {
    warnings.push(`${game.id}: unfamiliar status ${String(game.status)}`);
  }

  if (hasAnyScore && game.status !== 3) {
    warnings.push(
      `${game.id}: scores present without status 3; inspect publication/finality behavior`,
    );
  }

  if (game.status === 3 && hasZeroScore) {
    warnings.push(
      `${game.id}: status 3 with a zero score; inspect finality assumption`,
    );
  }
};

const inspectCompetition = (game: GameObservation, warnings: string[]) => {
  const isChampionship = game.id.startsWith(CUP_CHAMPIONSHIP_PREFIX);
  const isMatchesChampionshipLabels =
    game.label === "Emirates NBA Cup" &&
    game.subLabel === "Championship" &&
    game.seriesText === "Neutral Site" &&
    game.subtype === "in-season-knockout";

  if (isChampionship && !isMatchesChampionshipLabels) {
    warnings.push(
      `${game.id}: championship metadata differs from observed labels; review, do not automatically exclude other games`,
    );
  }

  if (!isChampionship && game.subLabel === "Championship") {
    warnings.push(`${game.id}: Championship label outside the 006 namespace`);
  }

  if (game.id.startsWith("001") && game.label !== "Preseason") {
    warnings.push(`${game.id}: preseason label differs from our theory`);
  }
};

// Structural failures are errors. Contradictions of our working theories are
// warnings: a changed label must not silently become a new eligibility rule.
export const inspectNbaFeed = (value: unknown, expectedSeason?: string) => {
  const root = asObject(value);
  const schedule = asObject(root?.leagueSchedule);

  if (!schedule || !Array.isArray(schedule.gameDates)) {
    throw new Error("Missing leagueSchedule.gameDates array");
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof schedule.seasonYear !== "string") {
    errors.push("Missing seasonYear string");
  }

  if (expectedSeason && schedule.seasonYear !== expectedSeason) {
    errors.push(
      `Expected season ${expectedSeason}, received ${String(schedule.seasonYear)}`,
    );
  }

  if (!expectedSeason) {
    warnings.push(
      "No --season supplied: season identity was not independently checked",
    );
  }

  const yearMatch = String(schedule.seasonYear).match(/^(\d{4})-(\d{2})$/);
  const seasonStartYear = yearMatch ? Number(yearMatch[1]) : undefined;

  if (!yearMatch) {
    warnings.push("Unfamiliar seasonYear format");
  }

  const games = collectGames(schedule.gameDates, errors);
  const seenIds = new Set<string>();

  for (const game of games) {
    if (seenIds.has(game.id)) {
      errors.push(`Duplicate gameId ${game.id}`);
    }

    seenIds.add(game.id);
    inspectIdentity(game, seasonStartYear, warnings);
    inspectTiming(game, seasonStartYear, warnings);
    inspectStatus(game, warnings);
    inspectCompetition(game, warnings);
  }

  if (games.length === 0) {
    errors.push("No usable games: assumptions could not be checked");
  }

  const statuses = countValues(games.map((game) => String(game.status)));
  const statusSamples = Object.keys(statuses).map((status) => ({
    games: games.filter((game) => String(game.status) === status).slice(0, 3),
    status,
  }));

  const scheduledPreseasonGames = games.filter(
    (game) => game.id.startsWith("001") && Number.isFinite(startTime(game)),
  );
  const firstPreseason = scheduledPreseasonGames.toSorted(
    (a, b) => startTime(a) - startTime(b),
  )[0];

  return {
    championships: games.filter((game) =>
      game.id.startsWith(CUP_CHAMPIONSHIP_PREFIX),
    ),
    errors,
    feedTime: asObject(root?.meta)?.time,
    firstPreseason,
    gameCount: games.length,
    prefixes: countValues(games.map((game) => game.id.slice(0, 3))),
    season: schedule.seasonYear,
    statuses,
    statusSamples,
    unassignedMatchups: games.filter((game) => !game.home || !game.away).length,
    warnings,
  };
};

const main = async () => {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean" },
      input: { type: "string" },
      save: { type: "string" },
      season: { type: "string" },
    },
  });

  if (values.help) {
    console.log(
      [
        "node scripts/check-nba-feed.ts [--season 2026-27] [--save NEW.json] [--input SAVED.json]",
        "One direct NBA fetch or offline snapshot analysis. No Astro, KV, polling or deployments.",
        "Errors exit 1; warnings require review but exit 0. --save never overwrites a file.",
      ].join("\n"),
    );
    return;
  }

  let data: unknown;

  if (values.input) {
    data = JSON.parse(await Fs.readFile(values.input, "utf8"));
  } else {
    const response = await fetch(NBA_SCHEDULE_URL, {
      headers: NBA_SCHEDULE_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    const contentType =
      response.headers.get("content-type") ?? "unknown content type";

    console.error(`NBA HTTP ${response.status}; ${contentType}`);

    if (!response.ok) {
      throw new Error(`NBA schedule request failed: ${response.status}`);
    }

    data = await response.json();
  }

  if (values.save) {
    const snapshot = `${JSON.stringify(data, undefined, 2)}\n`;

    await Fs.writeFile(values.save, snapshot, { flag: "wx" });
  }

  const report = inspectNbaFeed(data, values.season);

  console.log(JSON.stringify(report, undefined, 2));

  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
};

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

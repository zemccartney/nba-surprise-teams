import type { CollectionEntry } from "astro:content";

import Fs from "node:fs/promises";

import { createContentApi } from "./content-api";

type RawTeamSeason = Omit<
  CollectionEntry<"teamSeasons">["data"],
  "season" | "team"
> & {
  season: string;
  team: CollectionEntry<"teams">["id"];
};

// Read on every invocation, not in a module-level cache. Keep arrays intact:
// unlike Astro's store, a Map would silently swallow duplicate IDs.
export const readContentFixture = async (
  directory = new URL("../src/content/", import.meta.url),
) => {
  const read = async <Data>(name: string): Promise<Data[]> => {
    const value: unknown = JSON.parse(
      await Fs.readFile(new URL(name, directory), "utf8"),
    );
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${name}: expected a nonempty content array`);
    }
    return value as Data[];
  };
  const [games, seasons, teams, teamSeasons] = await Promise.all([
    read<CollectionEntry<"games">["data"]>("games.json"),
    read<CollectionEntry<"seasons">["data"]>("seasons.json"),
    read<CollectionEntry<"teams">["data"]>("teams.json"),
    read<RawTeamSeason>("teamSeasons.json"),
  ]);
  const raw = { games, seasons, teams, teamSeasons };
  const entries = {
    games: games.map((data) => ({
      collection: "games" as const,
      data,
      id: data.id,
    })),
    seasons: seasons.map((data) => ({
      collection: "seasons" as const,
      data,
      id: data.id,
    })),
    teams: teams.map((data) => ({
      collection: "teams" as const,
      data,
      id: data.id,
    })),
    teamSeasons: teamSeasons.map((data) => ({
      collection: "teamSeasons" as const,
      data: {
        ...data,
        season: { collection: "seasons" as const, id: data.season },
        team: { collection: "teams" as const, id: data.team },
      },
      id: data.id,
    })),
  };
  // Only the content API boundary is substituted. Domain calculations still
  // run the real application helpers against these freshly read entries.
  const api = createContentApi(entries);
  return { api, entries, raw };
};

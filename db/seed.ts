import { db, SeasonCaches } from "astro:db";
import { SEASONS } from "../src/data";

// TODO Add season static data here over time

// https://astro.build/db/seed
export default async function seed() {
  // TODO Import static data for past seasons (any and all on file)

  await db.insert(SeasonCaches).values(
    SEASONS.map((season) => ({
      id: season.id,
    })),
  );
}

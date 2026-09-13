import type { CollectionEntry } from "astro:content";

type Collection = "games" | "seasons" | "teams" | "teamSeasons";
type Entries = { [Name in Collection]: CollectionEntry<Name>[] };

// Supply only what a test needs. Missing IDs behave like Astro; querying a
// collection that the test did not supply is a fixture setup error.
export const createContentApi = (entries: Partial<Entries>) => {
  const collection = (name: Collection) => {
    const values = entries[name];
    if (!values) throw new Error(`Collection not supplied in fixture: ${name}`);
    return values;
  };
  return {
    getCollection: async (
      name: Collection,
      filter?: (entry: CollectionEntry<Collection>) => unknown,
    ) => {
      const values = collection(name);
      return filter ? values.filter((entry) => filter(entry)) : [...values];
    },
    getEntry: async (name: Collection, id: string) =>
      collection(name).find((entry) => entry.id === id),
  };
};

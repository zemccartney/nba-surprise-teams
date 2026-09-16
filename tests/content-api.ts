import type { CollectionEntry } from "astro:content";

type Collection = "games" | "seasons" | "teams" | "teamSeasons";
type Entries = { [Name in Collection]: CollectionEntry<Name>[] };
interface Reference<Name extends Collection> {
  collection: Name;
  id: string;
}

// Supply only what a test needs. Missing IDs behave like Astro; querying a
// collection that the test did not supply is a fixture setup error.
export const createContentApi = (entries: Partial<Entries>) => {
  const collection = <Name extends Collection>(name: Name) => {
    const values = entries[name];

    if (!values) {
      throw new Error(`Collection not supplied in fixture: ${name}`);
    }

    // The mapped input type ties every array to its collection. TypeScript
    // needs this narrowing when indexing it with a generic collection name.
    return values as CollectionEntry<Name>[];
  };

  function getCollection<
    Name extends Collection,
    Entry extends CollectionEntry<Name>,
  >(
    name: Name,
    isMatch: (entry: CollectionEntry<Name>) => entry is Entry,
  ): Promise<Entry[]>;
  function getCollection<Name extends Collection>(
    name: Name,
    filter?: (entry: CollectionEntry<Name>) => unknown,
  ): Promise<CollectionEntry<Name>[]>;
  async function getCollection<Name extends Collection>(
    name: Name,
    filter?: (entry: CollectionEntry<Name>) => unknown,
  ) {
    const values = collection(name);

    return filter ? values.filter((entry) => filter(entry)) : [...values];
  }

  function getEntry<Name extends Collection>(
    reference: Reference<Name>,
  ): Promise<CollectionEntry<Name> | undefined>;
  function getEntry<Name extends Collection>(
    name: Name,
    id: string,
  ): Promise<CollectionEntry<Name> | undefined>;
  async function getEntry<Name extends Collection>(
    nameOrReference: Name | Reference<Name>,
    id?: string,
  ) {
    const name =
      typeof nameOrReference === "string"
        ? nameOrReference
        : nameOrReference.collection;
    const entryId =
      typeof nameOrReference === "string" ? id : nameOrReference.id;

    return collection(name).find((entry) => entry.id === entryId);
  }

  return { getCollection, getEntry };
};

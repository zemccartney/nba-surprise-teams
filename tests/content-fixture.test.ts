import Fs from "node:fs/promises";
import Os from "node:os";
import Path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { createContentApi } from "./content-api";
import { readContentFixture } from "./content-fixture";

it("distinguishes missing IDs from collections omitted by the test", async () => {
  const api = createContentApi({ seasons: [] });
  await expect(api.getEntry("seasons", "missing")).resolves.toBeUndefined();
  await expect(api.getCollection("seasons")).resolves.toEqual([]);
  await expect(api.getEntry("games", "missing")).rejects.toThrow(
    "Collection not supplied in fixture: games",
  );
  await expect(api.getCollection("games")).rejects.toThrow(
    "Collection not supplied in fixture: games",
  );
});

const withContent = async (check: (url: URL) => Promise<void>) => {
  const directory = await Fs.mkdtemp(
    Path.join(Os.tmpdir(), "nbastt-content-test-"),
  );
  try {
    await Fs.cp(new URL("../src/content/", import.meta.url), directory, {
      recursive: true,
    });
    await check(pathToFileURL(`${directory}/`));
  } finally {
    await Fs.rm(directory, { force: true, recursive: true });
  }
};

describe("fresh content snapshots", () => {
  it("supports reference lookups and collection filters", async () => {
    const fixture = await readContentFixture();
    const season = fixture.entries.seasons[0];

    if (!season) {
      throw new Error("Expected a season fixture");
    }

    await expect(
      fixture.api.getEntry({
        collection: "seasons",
        id: season.id,
      }),
    ).resolves.toEqual(season);

    await expect(
      fixture.api.getCollection("seasons", (entry) => entry.id === season.id),
    ).resolves.toEqual([season]);
  });

  it("reads changed games on the next invocation without a dev server", () =>
    withContent(async (url) => {
      const first = await readContentFixture(url);
      const changed = first.raw.games.slice(0, -1);
      await Fs.writeFile(new URL("games.json", url), JSON.stringify(changed));
      const second = await readContentFixture(url);
      expect(second.entries.games).toHaveLength(first.entries.games.length - 1);
      expect(
        second.entries.games.some(
          ({ id }) => id === first.entries.games.at(-1)?.id,
        ),
      ).toBe(false);
    }));

  it.each(["games", "seasons", "teams", "teamSeasons"])(
    "rejects empty %s instead of passing vacuously",
    (name) =>
      withContent(async (url) => {
        await Fs.writeFile(new URL(`${name}.json`, url), "[]");
        await expect(readContentFixture(url)).rejects.toThrow(
          "nonempty content array",
        );
      }),
  );

  it("preserves duplicate IDs for the integrity assertions", () =>
    withContent(async (url) => {
      const original = await readContentFixture(url);
      const changed = [...original.raw.games, original.raw.games[0]];
      await Fs.writeFile(new URL("games.json", url), JSON.stringify(changed));
      const next = await readContentFixture(url);
      expect(next.entries.games).toHaveLength(changed.length);
      expect(new Set(next.entries.games.map(({ id }) => id)).size).toBe(
        changed.length - 1,
      );
    }));
});

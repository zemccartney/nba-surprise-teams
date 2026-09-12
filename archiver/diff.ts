/*
  Explains a games.json change. `git diff` can't: the file is one line, marked
  -diff in .gitattributes, and a corrected score keeps the byte count.

  Usage: pnpm run archive:diff [--from <git-rev>] [--to <path>]
  Defaults: --from HEAD (the committed file), --to src/content/games.json (the
  working tree). Prints ids added/removed, order changes, and per-game value
  changes; exits 0 either way.
*/
import ChildProcess from "node:child_process";
import Fs from "node:fs";
import { parseArgs } from "node:util";

interface Game {
  id: string;
  playedOn: string;
  seasonId: string;
  teams: { score: number; teamId: string }[];
}

const GAMES_PATH = "src/content/games.json";
const LIST_LIMIT = 20;

const { values: args } = parseArgs({
  options: {
    from: { default: "HEAD", type: "string" },
    to: { default: GAMES_PATH, type: "string" },
  },
});

const readCommitted = (rev: string): string =>
  ChildProcess.execFileSync("git", ["show", `${rev}:${GAMES_PATH}`], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });

const before = JSON.parse(readCommitted(args.from)) as Game[];
const after = JSON.parse(Fs.readFileSync(args.to, "utf8")) as Game[];

// Stable serialization: object keys sorted, so key order never counts as a change
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).toSorted(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );

const list = (items: string[]): string => {
  const shown = items.slice(0, LIST_LIMIT).join(", ");
  const rest = items.length - LIST_LIMIT;
  return rest > 0 ? `${shown} … and ${rest} more` : shown;
};

const beforeById = new Map(before.map((game) => [game.id, game]));
const afterById = new Map(after.map((game) => [game.id, game]));

const added = afterById
  .keys()
  .filter((id) => !beforeById.has(id))
  .toArray();
const removed = beforeById
  .keys()
  .filter((id) => !afterById.has(id))
  .toArray();

let firstOrderChange = -1;
for (const [index, game] of before.entries()) {
  if (after[index]?.id !== game.id) {
    firstOrderChange = index;
    break;
  }
}

const changed: { after: Game; before: Game; id: string }[] = [];
const keyOrderOnly: string[] = [];
for (const [id, game] of beforeById) {
  const counterpart = afterById.get(id);
  if (!counterpart) continue;
  if (canonical(game) !== canonical(counterpart)) {
    changed.push({ after: counterpart, before: game, id });
  } else if (JSON.stringify(game) !== JSON.stringify(counterpart)) {
    keyOrderOnly.push(id);
  }
}

console.log(
  `${args.from}: ${before.length} games; ${args.to}: ${after.length} games`,
);
console.log(
  `added: ${added.length}${added.length > 0 ? ` (${list(added)})` : ""}`,
);
console.log(
  `removed: ${removed.length}${removed.length > 0 ? ` (${list(removed)})` : ""}`,
);
console.log(
  firstOrderChange === -1
    ? "order: unchanged"
    : `order: differs from index ${firstOrderChange} (${before[firstOrderChange]?.id} vs ${after[firstOrderChange]?.id})`,
);

const changedBySeason = new Map<string, number>();
for (const { before: game } of changed) {
  changedBySeason.set(
    game.seasonId,
    (changedBySeason.get(game.seasonId) ?? 0) + 1,
  );
}
console.log(
  `changed: ${changed.length}${
    changed.length > 0
      ? ` (by season: ${[...changedBySeason]
          .map(([season, count]) => `${season}: ${count}`)
          .join(", ")})`
      : ""
  }`,
);
for (const { after: next, before: previous, id } of changed.slice(
  0,
  LIST_LIMIT,
)) {
  const fields = new Set([...Object.keys(next), ...Object.keys(previous)]);
  const details = [...fields]
    .filter(
      (field) =>
        canonical(previous[field as keyof Game]) !==
        canonical(next[field as keyof Game]),
    )
    .map(
      (field) =>
        `${field}: ${JSON.stringify(previous[field as keyof Game])} -> ${JSON.stringify(next[field as keyof Game])}`,
    );
  console.log(`  ${id}: ${details.join("; ")}`);
}
if (changed.length > LIST_LIMIT)
  console.log(`  … and ${changed.length - LIST_LIMIT} more`);
if (keyOrderOnly.length > 0) {
  console.log(
    `same values, different key order: ${keyOrderOnly.length} (${list(keyOrderOnly)})`,
  );
}

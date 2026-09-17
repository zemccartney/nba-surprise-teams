import { describe, expect, it } from "vitest";

import { decodeArchive } from "../data/node/nba-archive";
import { readContentFixture } from "./content-fixture";
const metadata = readContentFixture();
const headers = ["GAME_DATE", "MATCHUP", "PTS", "TEAM_ABBREVIATION", "GAME_ID"];
const row = (team = "CHA", score = 101, id = "0022500001") => [
  "2025-11-01",
  team === "CHA" ? "CHA @ ATL" : "ATL vs. CHA",
  score,
  team,
  id,
];
const feed = (rows: unknown[][]) => ({
  resultSets: [{ headers, rowSet: rows }],
});
describe("historical NBA archive decoder", () => {
  it("pairs both scores and retains provider identity in stable team order", () => {
    expect(
      decodeArchive(feed([row(), row("ATL", 99)]), "2025", metadata),
    ).toEqual([
      {
        id: "2025-11-01/ATL__CHA",
        nbaGameId: "0022500001",
        playedOn: "2025-11-01",
        seasonId: "2025",
        teams: [
          { score: 99, teamId: "ATL" },
          { score: 101, teamId: "CHA" },
        ],
      },
    ]);
  });
  it("does not turn a missing opponent row into a zero score", () =>
    expect(() => decodeArchive(feed([row()]), "2025", metadata)).toThrow(
      "Incomplete NBA matchup",
    ));
  it("rejects duplicate team rows", () =>
    expect(() => decodeArchive(feed([row(), row()]), "2025", metadata)).toThrow(
      "Duplicate NBA team row",
    ));
  it("rejects conflicting provider identities", () =>
    expect(() =>
      decodeArchive(
        feed([row(), row("ATL", 99, "different")]),
        "2025",
        metadata,
      ),
    ).toThrow("Conflicting NBA identities"));
  it("rejects missing columns and invalid scores", () => {
    expect(() =>
      decodeArchive(
        { resultSets: [{ headers: [], rowSet: [] }] },
        "2025",
        metadata,
      ),
    ).toThrow("Missing NBA column");
    expect(() =>
      decodeArchive(feed([row("CHA", 0), row("ATL", 99)]), "2025", metadata),
    ).toThrow();
  });
  it("excludes championship games", () =>
    expect(
      decodeArchive(
        feed([row("CHA", 101, "0062500001"), row("ATL", 99, "0062500001")]),
        "2025",
        metadata,
      ),
    ).toEqual([]));
  it("accepts historical aliases and rejects seasons without candidates", () => {
    const historic = {
      ...metadata,
      teamSeasons: [
        {
          id: "1993/CHA",
          overUnder: 20,
          seasonId: "1993",
          teamId: "CHA" as const,
        },
      ],
    };
    const rows = [
      ["1993-11-01", "CHH @ ATL", 101, "CHH", "0029300001"],
      ["1993-11-01", "ATL vs. CHH", 99, "ATL", "0029300001"],
    ];
    expect(
      decodeArchive(feed(rows), "1993", historic)[0]?.teams[1].teamId,
    ).toBe("CHA");
    expect(() => decodeArchive(feed(rows), "9999", metadata)).toThrow(
      "No surprise candidates",
    );
  });
});

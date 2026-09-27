import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { showdownScatterChart } from "../src/components/charts/showdown-scatter";
import { showdownHistoryBody } from "../src/components/charts/showdown-standings";
import {
  scatterBody,
  seasonBody,
  teamBody,
} from "../src/components/charts/tanstack-options";

// This small DOM construction spy keeps the builder contract in the normal
// unit gate. The browser fixture harness separately verifies real HTML parsing
// and escaping; this is not a replacement DOM implementation.
const rejectHtml = () => {
  throw new Error("Chart bodies must use DOM text, not HTML parsing");
};
class ConstructionNode {
  alt = "";
  children: ConstructionNode[] = [];
  src = "";
  tag: string;
  textContent = "";
  constructor(tag: string) {
    this.tag = tag;
    Object.defineProperty(this, "innerHTML", {
      get: rejectHtml,
      set: rejectHtml,
    });
  }
  appendChild(child: ConstructionNode) {
    this.children.push(child);
    return child;
  }
}

const name = 'Team "quoted" & <historic>';
const logoSrc = '/logo".svg';
const team = {
  logoSrc,
  name,
  numEliminated: 2,
  numSurprised: 1,
  teamId: "CHA",
};
const cases = [
  {
    build: () =>
      seasonBody({
        numSurprises: 1,
        seasonId: "2025",
        seasonRange: "2025–26",
        surpriseTeams: [team],
      }),
    name: "season",
  },
  { build: () => teamBody(team), name: "team" },
  {
    build: () =>
      teamBody({
        ...team,
        history: [{ duration: [1995, 2000], logoSrc, name, teamId: "CHA" }],
      }),
    name: "history",
  },
  {
    build: () =>
      scatterBody({
        isSurpriseTeam: true,
        logoSrc,
        overUnder: 20,
        pace: 1,
        recordFmt: "31 - 51",
        seasonRange: "2025–26",
        teamName: name,
      }),
    name: "scatter",
  },
];

describe("chart tooltip DOM construction", () => {
  let nodes: ConstructionNode[];
  beforeEach(() => {
    nodes = [];
    const create = (tag: string, text = "") => {
      const node = new ConstructionNode(tag);
      node.textContent = text;
      nodes.push(node);
      return node;
    };
    vi.stubGlobal("document", {
      createElement: (tag: string) => create(tag),
      createTextNode: (text: string) => create("#text", text),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("renders concise Showdown records and name-era breakdowns without HTML parsing", () => {
    showdownHistoryBody({
      history: [
        {
          firstSeason: 1974,
          l: 3,
          lastSeason: 1996,
          logoSrc: "/bullets.svg",
          name: "Washington Bullets",
          pct: 0.25,
          w: 1,
        },
        {
          firstSeason: 1997,
          l: 3,
          logoSrc: "/wizards.svg",
          name: "Washington Wizards",
          pct: 0.5,
          w: 3,
        },
      ],
      l: 6,
      logoSrc,
      name,
      pct: 0.4,
      teamId: "WAS",
      w: 4,
    });
    expect(nodes.filter((node) => node.tag === "img")).toHaveLength(3);
    const text = nodes.map((node) => node.textContent).join(" ");
    expect(text).toContain("4–6 | 40.0% (10 games played)");
    expect(text).toContain("Washington Bullets");
    expect(text).toContain("1974–1997");
    expect(text).toContain("1–3 | 25.0% (4 games played)");
    expect(text).toContain("1997–present");
    expect(text).toContain("3–3 | 50.0% (6 games played)");
    expect(text).not.toContain("Archived seasons only");
  });
  it("shows complete scatter history without pinning", () => {
    const era = {
      firstSeason: 1990,
      l: 2,
      logoSrc,
      name: "Historical name",
      pct: 0.5,
      w: 2,
    };
    showdownScatterChart({ data: [] }).body({
      ...team,
      gamesPlayed: 8,
      history: [era, { ...era, firstSeason: 2000 }],
      l: 4,
      pct: 0.5,
      w: 4,
    });
    const text = nodes.map((node) => node.textContent).join(" ");
    expect(text).toContain("4–4 | 50.0% (8 games played)");
    expect(text).toContain("Historical name");
    expect(text).not.toContain("Click or press Enter");
    expect(nodes.filter((node) => node.tag === "img")).toHaveLength(3);
  });
  it.each(cases)(
    "preserves literal names, sources and meaningful alternatives for $name",
    ({ build }) => {
      build();
      const images = nodes.filter((node) => node.tag === "img");
      expect(images).toHaveLength(1);
      expect(images[0]?.alt).toBe(`Logo for ${name}`);
      expect(images[0]?.src).toBe(logoSrc);
      expect(nodes.some((node) => node.textContent.includes(name))).toBe(true);
    },
  );
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

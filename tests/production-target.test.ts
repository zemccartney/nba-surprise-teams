import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

import { assertProductionTarget } from "../scripts/assert-production-target";

it("preserves the Pages referrer policy for static documents", () => {
  const headers = readFileSync(
    new URL("../public/_headers", import.meta.url),
    "utf8",
  );
  expect(headers).toMatch(
    /^\/\*\n\s+Referrer-Policy: strict-origin-when-cross-origin$/m,
  );
});

const config = {
  compatibilityDate: "2026-09-10",
  domains: ["nbastt.grepco.net", "nba-surprise-teams.grepco.net"],
  env: {
    ASSETS: { type: "assets" },
    GAMES_KV: { id: "6061594acc5c4fb6b3846b0c78f9e5a3", type: "kv" },
  },
  name: "nba-surprise-teams",
  previewUrls: true,
  workersDev: true,
};
const context = { buildContext: { isPreview: false, mode: "production" } };

it("requires production KV and exactly both approved custom domains, independent of order", () => {
  expect(() => assertProductionTarget(config, context)).not.toThrow();
  expect(() =>
    assertProductionTarget(
      { ...config, domains: config.domains.toReversed() },
      context,
    ),
  ).not.toThrow();
});

it.each([
  undefined,
  {},
  { ...config, name: "nbastt-preview" },
  { ...config, workersDev: false },
  { ...config, env: {} },
  {
    ...config,
    env: {
      ...config.env,
      GAMES_KV: { id: "6a0d30705c634691873dd1dd122969e3", type: "kv" },
    },
  },
  { ...config, route: "nbastt.grepco.net/*" },
  { ...config, domains: [config.domains[0]] },
  { ...config, domains: "invalid" },
  { ...config, domains: undefined },
  { ...config, domains: [] },
  { ...config, domains: [config.domains[0], config.domains[0]] },
  { ...config, domains: [config.domains[0], "other.grepco.net"] },
  { ...config, routes: [{ pattern: "example.com/*" }] },
])("rejects unsafe production configuration %#", (value) => {
  expect(() => assertProductionTarget(value, context)).toThrow();
});

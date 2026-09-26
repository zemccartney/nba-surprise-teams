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
  kv_namespaces: [
    { binding: "GAMES_KV", id: "6061594acc5c4fb6b3846b0c78f9e5a3" },
  ],
  name: "nba-surprise-teams",
  routes: [
    { custom_domain: true, pattern: "nbastt.grepco.net" },
    { custom_domain: true, pattern: "nba-surprise-teams.grepco.net" },
  ],
  workers_dev: true,
};

it("requires production KV and exactly both approved custom domains", () => {
  expect(() => assertProductionTarget(config)).not.toThrow();
  expect(() =>
    assertProductionTarget({ ...config, routes: config.routes.toReversed() }),
  ).not.toThrow();
});

it.each([
  undefined,
  {},
  { ...config, name: "nbastt-preview" },
  { ...config, workers_dev: false },
  { ...config, kv_namespaces: [] },
  {
    ...config,
    kv_namespaces: [
      { binding: "GAMES_KV", id: "6a0d30705c634691873dd1dd122969e3" },
    ],
  },
  { ...config, route: "nbastt.grepco.net/*" },
  {
    ...config,
    routes: [{ custom_domain: true, pattern: "nbastt.grepco.net" }],
  },
  { ...config, routes: "invalid" },
  { ...config, routes: undefined },
  { ...config, routes: [] },
  { ...config, routes: [config.routes[0], config.routes[0]] },
  {
    ...config,
    routes: [
      config.routes[0],
      { custom_domain: true, pattern: "other.grepco.net" },
    ],
  },
  {
    ...config,
    routes: config.routes.map((route) => ({ ...route, custom_domain: false })),
  },
])("rejects unsafe production configuration %#", (value) => {
  expect(() => assertProductionTarget(value)).toThrow(
    "Refusing production deployment",
  );
});

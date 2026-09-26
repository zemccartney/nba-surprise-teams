import { expect, it } from "vitest";

import { assertProductionTarget } from "../scripts/assert-production-target";

const config = {
  kv_namespaces: [
    { binding: "GAMES_KV", id: "6061594acc5c4fb6b3846b0c78f9e5a3" },
  ],
  name: "nba-surprise-teams",
  workers_dev: true,
};

it("accepts only the initial production target without custom domains", () => {
  expect(() => assertProductionTarget(config)).not.toThrow();
  expect(() => assertProductionTarget({ ...config, routes: [] })).not.toThrow();
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
])("rejects unsafe initial production configuration %#", (value) => {
  expect(() => assertProductionTarget(value)).toThrow(
    "Refusing production deployment",
  );
});

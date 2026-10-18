import { describe, expect, it } from "vitest";

import { assertPreviewTarget } from "../scripts/assert-preview-target";
import { assertProductionTarget } from "../scripts/assert-production-target";

const preview = {
  compatibilityDate: "2026-09-10",
  domains: [],
  env: {
    ASSETS: { type: "assets" },
    GAMES_KV: { id: "6a0d30705c634691873dd1dd122969e3", type: "kv" },
    PUBLIC_DEPLOY_ENV: { type: "text", value: "preview" },
  },
  name: "nba-surprise-teams",
  previewUrls: true,
  workersDev: true,
};
const production = {
  ...preview,
  domains: ["nbastt.grepco.net", "nba-surprise-teams.grepco.net"],
  env: {
    ASSETS: { type: "assets" },
    GAMES_KV: { id: "6061594acc5c4fb6b3846b0c78f9e5a3", type: "kv" },
  },
};
const context = { buildContext: { isPreview: true, mode: "production" } };
const prodContext = { buildContext: { isPreview: false, mode: "production" } };

describe("cf Build Output target guards", () => {
  it("accepts isolated preview and approved production output", () => {
    expect(() => assertPreviewTarget(preview, context)).not.toThrow();
    expect(() => assertProductionTarget(production, prodContext)).not.toThrow();
  });

  it.each([
    undefined,
    {},
    production,
    { ...preview, name: "other" },
    { ...preview, domains: production.domains },
    { ...preview, routes: ["example.com/*"] },
    { ...preview, env: { ...preview.env, GAMES_KV: production.env.GAMES_KV } },
    {
      ...preview,
      env: {
        ...preview.env,
        SECRET: { service: "production", type: "service" },
      },
    },
    {
      ...preview,
      env: {
        ...preview.env,
        PUBLIC_DEPLOY_ENV: { type: "text", value: "production" },
      },
    },
    {
      ...preview,
      env: {
        ...preview.env,
        GAMES_KV: { ...preview.env.GAMES_KV, dev: { remote: true } },
      },
    },
  ])("rejects unsafe preview output %#", (value) => {
    expect(() => assertPreviewTarget(value, context)).toThrow();
  });

  it.each([
    undefined,
    {},
    prodContext,
    { buildContext: { isPreview: true, mode: "development" } },
  ])("rejects wrong or missing preview build context %#", (value) => {
    expect(() => assertPreviewTarget(preview, value)).toThrow();
  });

  it.each([
    preview,
    { ...production, domains: [production.domains[0], production.domains[0]] },
    { ...production, domains: [] },
    { ...production, workersDev: false },
    {
      ...production,
      env: { ...production.env, GAMES_KV: preview.env.GAMES_KV },
    },
  ])("rejects unsafe production output %#", (value) => {
    expect(() => assertProductionTarget(value, prodContext)).toThrow();
  });

  it("rejects preview-marked output for production even with production bindings", () => {
    expect(() => assertProductionTarget(production, context)).toThrow();
  });
});

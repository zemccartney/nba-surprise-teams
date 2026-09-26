import { describe, expect, it } from "vitest";

import { assertPreviewTarget } from "../scripts/assert-preview-target";

const previews = {
  kv_namespaces: [
    { binding: "GAMES_KV", id: "6a0d30705c634691873dd1dd122969e3" },
  ],
  vars: { PUBLIC_DEPLOY_ENV: "preview" },
};
const config = {
  // Native Preview publishing must select previews, not these production settings.
  kv_namespaces: [
    { binding: "GAMES_KV", id: "6061594acc5c4fb6b3846b0c78f9e5a3" },
  ],
  name: "nba-surprise-teams",
  previews,
};

describe("generated native Preview target guard", () => {
  it("accepts preview KV independent of production bindings", () => {
    expect(() => assertPreviewTarget(config)).not.toThrow();
  });
  it.each([
    undefined,
    {},
    { ...config, name: "nbastt-preview" },
    { ...config, previews: undefined },
    { ...config, previews: { ...previews, kv_namespaces: [] } },
    {
      ...config,
      previews: { ...previews, kv_namespaces: config.kv_namespaces },
    },
    {
      ...config,
      previews: {
        ...previews,
        kv_namespaces: [...previews.kv_namespaces, ...previews.kv_namespaces],
      },
    },
    {
      ...config,
      previews: {
        ...previews,
        kv_namespaces: [
          { ...previews.kv_namespaces[0], preview_id: "production" },
        ],
      },
    },
    {
      ...config,
      previews: { ...previews, vars: { PUBLIC_DEPLOY_ENV: "production" } },
    },
    { ...config, previews: { ...previews, vars: undefined } },
    {
      ...config,
      previews: {
        ...previews,
        vars: { PUBLIC_DEPLOY_ENV: "preview", UNREVIEWED: "value" },
      },
    },
    { ...config, previews: { ...previews, routes: ["nbastt.grepco.net/*"] } },
    {
      ...config,
      previews: {
        ...previews,
        services: [{ binding: "PROD", service: "production" }],
      },
    },
  ])("rejects unsafe or incomplete Preview settings %#", (value) => {
    expect(() => assertPreviewTarget(value)).toThrow("Refusing to publish");
  });
});

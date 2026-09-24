import { describe, expect, it } from "vitest";

import { assertPreviewTarget } from "../scripts/assert-preview-target";

const preview = {
  kv_namespaces: [
    { binding: "GAMES_KV", id: "6a0d30705c634691873dd1dd122969e3" },
  ],
  name: "nbastt-preview",
  preview_urls: true,
  routes: [],
  workers_dev: true,
};

describe("generated preview target guard", () => {
  it("accepts the isolated Worker and preview KV", () => {
    expect(() => assertPreviewTarget(preview)).not.toThrow();
  });
  it.each([
    undefined,
    {},
    { ...preview, name: "nbastt" },
    {
      ...preview,
      kv_namespaces: [
        { binding: "GAMES_KV", id: "6061594acc5c4fb6b3846b0c78f9e5a3" },
      ],
    },
    { ...preview, kv_namespaces: [] },
    {
      ...preview,
      kv_namespaces: [...preview.kv_namespaces, ...preview.kv_namespaces],
    },
    {
      ...preview,
      routes: [{ custom_domain: true, pattern: "nbastt.grepco.net" }],
    },
    { ...preview, route: "nbastt.grepco.net/*" },
    { ...preview, workers_dev: false },
    { ...preview, preview_urls: false },
  ])("rejects unsafe or incomplete configuration %#", (value) => {
    expect(() => assertPreviewTarget(value)).toThrow("Refusing to publish");
  });
});

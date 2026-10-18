import Path from "node:path";
import { resolveConfig } from "vite";
import { describe, expect, it } from "vitest";

import {
  captureBuildOutput,
  cloudflareOutputDirectory,
  workerOutputDirectory,
} from "../scripts/build-output";

describe("build output directories", () => {
  it("reads final Vite paths, including mutations after its configResolved hook", async () => {
    const output = captureBuildOutput();
    const root = Path.resolve("/tmp/NBA Tracker #é");
    await resolveConfig(
      {
        configFile: false,
        environments: {
          client: { build: { outDir: "stale/client" } },
          ssr: { build: { outDir: "stale/server" } },
        },
        plugins: [
          output.plugin,
          {
            configResolved(config) {
              const { client, ssr } = config.environments;
              if (!client || !ssr) throw new Error("Missing test environments");
              client.build.outDir = "custom output/assets";
              ssr.build.outDir = Path.join(root, "custom output/bundle");
            },
            enforce: "post",
            name: "adapter-output-override",
          },
        ],
        root,
      },
      "build",
    );
    expect(output.clientDirectory()).toBe(
      Path.join(root, "custom output/assets"),
    );
    expect(output.workerDirectory()).toBe(Path.join(root, "custom output"));
  });

  it("fails closed before Vite resolves output paths", () => {
    const output = captureBuildOutput();
    expect(() => output.clientDirectory()).toThrow("Vite");
    expect(() => output.workerDirectory()).toThrow("Vite");
  });

  it("rejects an unexpected Worker layout rather than auditing the wrong files", async () => {
    const output = captureBuildOutput();
    await resolveConfig(
      {
        configFile: false,
        environments: {
          client: { build: { outDir: "unrelated/client" } },
          ssr: { build: { outDir: "output/bundle" } },
        },
        plugins: [output.plugin],
      },
      "build",
    );
    expect(() => output.workerDirectory()).toThrow("Worker output layout");
  });

  it("centralizes the cf specification layout for standalone commands", () => {
    expect(cloudflareOutputDirectory).toBe(".cloudflare/output/v0");
    expect(workerOutputDirectory("custom output")).toBe(
      Path.resolve("custom output/workers/default"),
    );
  });
});

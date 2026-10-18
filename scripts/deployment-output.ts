import { z } from "astro/zod";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import Path from "node:path";

import {
  cloudflareOutputDirectory,
  workerOutputDirectory,
} from "./build-output.ts";

const workerSchema = z
  .object({
    compatibilityDate: z.literal("2026-09-10"),
    compatibilityFlags: z.array(z.string()).optional(),
    domains: z.array(z.string()),
    env: z
      .object({
        ASSETS: z.object({ type: z.literal("assets") }).strict(),
        GAMES_KV: z.object({ id: z.string(), type: z.literal("kv") }).strict(),
        PUBLIC_DEPLOY_ENV: z
          .object({ type: z.literal("text"), value: z.literal("preview") })
          .strict()
          .optional(),
      })
      .strict(),
    manifest: z.unknown().optional(),
    name: z.literal("nba-surprise-teams"),
    observability: z.unknown().optional(),
    previewUrls: z.literal(true),
    workersDev: z.literal(true),
  })
  .strict();

export function assertDeploymentOutput(
  worker: unknown,
  context: unknown,
  isPreview: boolean,
): void {
  const parsed = workerSchema.parse(worker);
  const root = z
    .object({
      buildContext: z.object({
        isPreview: z.boolean(),
        mode: z.literal("production"),
      }),
    })
    .parse(context);
  assert.equal(root.buildContext.isPreview, isPreview, "Wrong build context");
  assert.equal(
    parsed.env.GAMES_KV.id,
    isPreview
      ? "6a0d30705c634691873dd1dd122969e3"
      : "6061594acc5c4fb6b3846b0c78f9e5a3",
    "Wrong KV namespace",
  );
  assert.deepEqual(
    parsed.domains.toSorted((a, b) => a.localeCompare(b)),
    isPreview ? [] : ["nba-surprise-teams.grepco.net", "nbastt.grepco.net"],
    "Wrong domains",
  );
  assert.equal(
    parsed.env.PUBLIC_DEPLOY_ENV?.value,
    isPreview ? "preview" : undefined,
    "Wrong environment binding",
  );
}

export function readDeploymentOutput(directory = cloudflareOutputDirectory) {
  assert.deepEqual(
    readdirSync(Path.join(directory, "workers")),
    ["default"],
    "Unexpected auxiliary Worker",
  );
  return {
    context: JSON.parse(
      readFileSync(Path.join(directory, "config.json"), "utf8"),
    ),
    worker: JSON.parse(
      readFileSync(
        Path.join(workerOutputDirectory(directory), "worker.config.json"),
        "utf8",
      ),
    ),
  };
}

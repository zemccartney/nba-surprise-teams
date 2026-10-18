import type { AstroIntegration } from "astro";

import { globSync, unlinkSync } from "node:fs";
import path from "node:path";

import { captureBuildOutput } from "./build-output.ts";

/**
Delete maps only after every Vite environment has finished uploading them.
*/
export function cleanBuildSourcemaps(directory: string): number {
  const maps = globSync("**/*.map", { cwd: directory });
  for (const map of maps) unlinkSync(path.resolve(directory, map));
  return maps.length;
}

export default function cleanBuildSourcemapsIntegration(): AstroIntegration {
  const output = captureBuildOutput();
  return {
    hooks: {
      // All Vite uploads have completed; run before tracker-data seals artifacts.
      "astro:build:done": ({ logger }) => {
        logger.info(
          `Removed ${cleanBuildSourcemaps(output.workerDirectory())} build source maps after all uploads`,
        );
      },
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({ vite: { plugins: [output.plugin] } });
      },
    },
    name: "clean-build-sourcemaps",
  };
}

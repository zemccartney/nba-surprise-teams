import type { AstroIntegration } from "astro";

import { globSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
Delete maps only after every Vite environment has finished uploading them.
*/
export function cleanBuildSourcemaps(directory: string): number {
  const maps = globSync("**/*.map", { cwd: directory });
  for (const map of maps) unlinkSync(path.resolve(directory, map));
  return maps.length;
}

export default function cleanBuildSourcemapsIntegration(): AstroIntegration {
  let output: string | undefined;
  return {
    hooks: {
      // All Vite uploads have completed; run before tracker-data seals artifacts.
      "astro:build:done": ({ logger }) => {
        if (!output)
          throw new Error("Missing build output for source map cleanup");
        logger.info(
          `Removed ${cleanBuildSourcemaps(output)} build source maps after all uploads`,
        );
      },
      "astro:config:done": ({ config }) => {
        // build:done's dir points at client assets, not the complete output.
        output = fileURLToPath(config.outDir);
      },
    },
    name: "clean-build-sourcemaps",
  };
}

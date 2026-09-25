import { globSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
Delete maps only after every Vite environment has finished uploading them.
*/
export function cleanBuildSourcemaps(directory: string): number {
  const maps = globSync("**/*.map", { cwd: directory });
  for (const map of maps) unlinkSync(path.resolve(directory, map));
  return maps.length;
}

if (import.meta.main) {
  console.log(
    `Removed ${cleanBuildSourcemaps("dist")} build source maps after all uploads`,
  );
}

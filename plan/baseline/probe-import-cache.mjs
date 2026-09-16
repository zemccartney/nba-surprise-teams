import assert from "node:assert/strict";
import { readFile, realpath, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Counterfactual only: this deliberately bypasses dev module freshness checks.
// Do not use as an application fix; it can retain stale image-asset mappings.
const [directory, mode] = process.argv.slice(2);
assert.ok(["enable", "restore"].includes(mode));
const root = await realpath(directory);
const repository = await realpath(
  fileURLToPath(new URL("../../", import.meta.url)),
);
assert.ok(root !== repository && !root.startsWith(repository + path.sep));
const file = await realpath(
  path.join(root, "node_modules/astro/dist/content/runtime.js"),
);
assert.ok(
  file.startsWith(root + path.sep),
  "Dependencies must be locally installed, not external symlinks",
);
const backup = file + ".render-probe-backup";
if (mode === "restore") {
  await writeFile(file, await readFile(backup));
  await unlink(backup);
} else {
  const source = await readFile(file, "utf8");
  const expression = 'await import("astro:asset-imports")';
  assert.equal(
    source.split(expression).length,
    4,
    "Expected three asset imports in this Astro runtime",
  );
  await writeFile(backup, source, { flag: "wx" });
  const cachedImport =
    '(await (probeAssetImports ??= import("astro:asset-imports")))';
  // Only getCollection/getEntry; leave the later rendered-body helper unchanged.
  const patched = source
    .replace(expression, () => cachedImport)
    .replace(expression, () => cachedImport);
  await writeFile(file, "let probeAssetImports;\n" + patched);
}
console.log(
  `${mode}: ${file}. Restart dev and clear only this copy's .vite cache.`,
);

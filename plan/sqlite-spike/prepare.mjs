/* eslint unicorn/no-incorrect-template-string-interpolation: "off" -- Generated Astro attributes use {games}, not JavaScript interpolation. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import console from "node:console";
import { cp, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const repository = await realpath(
  fileURLToPath(new URL("../../", import.meta.url)),
);
const root = await realpath(process.argv[2]);
assert.ok(
  root !== repository && !root.startsWith(repository + path.sep),
  "Use an external copy",
);
const manifest = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
assert.equal(manifest.name, "surprise-teams", "Expected an NBA tracker copy");
const configPath = path.join(root, "astro.config.mjs");
let config = await readFile(configPath, "utf8");
for (const marker of ["adapter: cloudflare({", "integrations: ["])
  assert.equal(config.split(marker).length, 2);
await mkdir(path.join(root, "src/sqlite-pilot")); // Refuse repeated preparation.
await cp(new URL("./", import.meta.url), path.join(root, "plan/sqlite-spike"), {
  filter: (file) => !/\.db(?:$|-|\.)/.test(path.basename(file)),
  recursive: true,
});
const panel = await readFile(
  new URL("templates/Panel.astro", import.meta.url),
  "utf8",
);
await writeFile(
  path.join(root, "src/sqlite-pilot/Panel.astro"),
  panel
    .replaceAll('"../catalog"', '"../../plan/sqlite-spike/catalog"')
    .replace(
      '"../../../src/components/charts/team-season-pace.astro"',
      '"../components/charts/team-season-pace.astro"',
    ),
);
await writeFile(
  path.join(root, "src/sqlite-pilot/Island.astro"),
  `---
import type { Game } from "../../plan/sqlite-spike/catalog";
import Panel from "./Panel.astro";
interface Props { games: Game[]; seasonId: string; teamId: string; }
Astro.response.headers.set("Cache-Control", "no-store");
---
<Panel {...Astro.props} />
`,
);
await mkdir(path.join(root, "src/pages/sqlite-spike"), { recursive: true });
for (const mode of ["archive", "island"]) {
  await writeFile(
    path.join(root, `src/pages/sqlite-spike/${mode}.astro`),
    `---
import Subpage from "../../layouts/subpage.astro";
// eslint-disable-next-line import-x/no-unresolved -- Provided by the pilot's Vite plugin.
import { getArchivedGames } from "virtual:tracker/archive";
import Panel from "../../sqlite-pilot/${mode === "archive" ? "Panel" : "Island"}.astro";
const games = getArchivedGames("2025", "CHA");
---
<Subpage title="SQLite pilot: ${mode}">
<h1>SQLite pilot: ${mode}</h1>
<p>Disposable experiment. This page does not modify the live-data path.</p>
<Panel ${mode === "island" ? "server:defer" : ""} games={games} seasonId="2025" teamId="CHA">
${mode === "island" ? '<p slot="fallback" data-pilot-loading>Waiting for the metadata-backed island…</p>' : ""}
</Panel>
</Subpage>
`,
  );
}
config =
  'import sqlitePilot from "./plan/sqlite-spike/integration.ts";\n' +
  config
    .replace(
      "adapter: cloudflare({",
      'adapter: cloudflare({\n    prerenderEnvironment: "node",',
    )
    .replace("integrations: [", "integrations: [\n    sqlitePilot(),");
await writeFile(configPath, config);
const generated = [
  "astro.config.mjs",
  "src/sqlite-pilot",
  "src/pages/sqlite-spike",
];
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/eslint/bin/eslint.js"),
    "--flag",
    "unstable_native_nodejs_ts_config",
    "--fix",
    ...generated,
  ],
  { cwd: root, stdio: "inherit" },
);
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/prettier/bin/prettier.cjs"),
    "--write",
    ...generated,
  ],
  { cwd: root, stdio: "inherit" },
);
console.log(
  `Prepared disposable SQLite pilot in ${root}; restore its DB before dev`,
);

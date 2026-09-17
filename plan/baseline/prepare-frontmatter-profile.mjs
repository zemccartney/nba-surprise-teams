import assert from "node:assert/strict";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Research only: supports separate git archives of f5382f3 and e2a8b30.
const root = await realpath(process.argv[2]);
const repository = await realpath(
  fileURLToPath(new URL("../../", import.meta.url)),
);
assert.ok(root !== repository && !root.startsWith(repository + path.sep));
const helper = "src/frontmatter-profile.ts";
const helperSource = `
import { AsyncLocalStorage } from "node:async_hooks";
const storage = new AsyncLocalStorage<{ request: string; path: string }>();
let sequence = 0;
export function withFrontmatterRequest<T>(request: Request, next: () => T): T {
  return storage.run({ request: request.headers.get("x-frontmatter-profile") ?? "request-" + ++sequence, path: new URL(request.url).pathname }, next);
}
export function startFrontmatter(name: string, url?: URL) {
  const context = storage.getStore();
  const start = performance.now();
  let last = start;
  const phases: { name: string; ms: number }[] = [];
  return {
    mark(name: string) {
      const now = performance.now();
      phases.push({ name, ms: now - last });
      last = now;
    },
    finish() {
      const end = performance.now();
      console.log("[frontmatter-profile] " + JSON.stringify({
        name, request: context?.request ?? null,
        path: context?.path ?? url?.pathname ?? null, start, end, ms: end - start, phases,
      }));
    },
  };
}
`;
const pending = new Map();

const targets = [
  ["src/pages/stats.astro", "const archivedSeasons =", "stats"],
  [
    "src/pages/[seasonId]/[teamId].astro",
    "const { season, team } =",
    "team-page",
  ],
  [
    "src/components/team-stats/index.astro",
    "const { seasonId, teamId } =",
    "team-index",
  ],
  [
    "src/components/team-stats/ui.astro",
    "const { games, teamSeason } =",
    "team-ui",
  ],
  ["src/components/logo.astro", "const {\n  class:", "logo"],
];
for (const [file, startMarker, name] of targets) {
  const original = await readFile(path.join(root, file), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(original);
  assert.ok(match, `Missing frontmatter: ${file}`);
  let frontmatter = match[1];
  const replace = (before, after) => {
    assert.equal(frontmatter.split(before).length, 2, `${file}: ${before}`);
    frontmatter = frontmatter.replace(before, () => after);
  };
  let relative = path
    .relative(path.dirname(file), helper)
    .replaceAll(path.sep, "/")
    .replace(/\.ts$/, "");
  if (!relative.startsWith(".")) relative = "./" + relative;
  frontmatter =
    `import { startFrontmatter } from ${JSON.stringify(relative)};\n` +
    frontmatter;
  replace(
    startMarker,
    `const __frontmatter = startFrontmatter(${JSON.stringify(name)}, Astro.url);\n` +
      startMarker,
  );
  const instrumentPhases = () => {
    switch (name) {
      case "stats": {
        for (const [marker, label] of [
          ["// All-time Top 10 Table", "initial collections"],
          ["// END All-time Top 10 Table", "top ten"],
          ["// END Surprises per Season chart", "per season"],
          ["// END Surprises by Team chart", "by team"],
          ["// END Team Season scatterplot", "scatter"],
        ]) {
          const actual = frontmatter.includes(marker)
            ? marker
            : "/* " + marker.slice(3) + " */";
          replace(
            actual,
            `__frontmatter.mark(${JSON.stringify(label)});\n` + actual,
          );
        }

        break;
      }
      case "team-page": {
        replace(
          "export const getStaticPaths = async () => {",
          'export const getStaticPaths = async () => {\nconst __paths = startFrontmatter("team-getStaticPaths");\ntry {',
        );
        replace(
          "return paths;\n};",
          "return paths;\n} finally { __paths.finish(); }\n};",
        );

        break;
      }
      case "team-ui": {
        replace(
          "const datapoints:",
          '__frontmatter.mark("summary helpers");\nconst datapoints:',
        );
        frontmatter += '\n__frontmatter.mark("chart points");';

        break;
      }
      // No default
    }
  };
  instrumentPhases();
  frontmatter += "\n__frontmatter.finish();";
  pending.set(
    file,
    "---\n" + frontmatter + "\n---" + original.slice(match[0].length),
  );
}
const middleware = await readFile(path.join(root, "src/middleware.ts"), "utf8");
assert.equal(middleware.split("export const onRequest =").length, 2);
pending.set(
  "src/middleware.ts",
  'import { withFrontmatterRequest } from "./frontmatter-profile";\n' +
    middleware.replace(
      "export const onRequest =",
      "const originalOnRequest =",
    ) +
    "\nexport const onRequest = defineMiddleware((ctx, next) => withFrontmatterRequest(ctx.request, () => originalOnRequest(ctx, next)));\n",
);
// Validate all markers before creating anything; refuse repeat preparation.
await writeFile(path.join(root, helper), helperSource, { flag: "wx" });
for (const [file, text] of pending)
  await writeFile(path.join(root, file), text);
console.log(`Prepared frontmatter timers in ${root}`);

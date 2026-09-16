import assert from "node:assert/strict";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Research-only instrumentation. Run from the working repo, targeting a separate
// git archive of e2a8b30. Never install these routes in the deployable source tree.
const root = await realpath(process.argv[2]);
const repository = await realpath(
  fileURLToPath(new URL("../../", import.meta.url)),
);
assert.ok(root !== repository && !root.startsWith(repository + path.sep));
const probe = path.join(root, "src/render-probe");
await mkdir(probe); // Exclusive: refuse a second application to the same copy.
const emit = (name, text) => writeFile(path.join(root, name), text);
const replace = async (name, before, after) => {
  const filename = path.join(root, name);
  const text = await readFile(filename, "utf8");
  assert.equal(
    text.split(before).length,
    2,
    `Expected one marker in ${name}: ${before}`,
  );
  await writeFile(
    filename,
    text.replace(before, () => after),
  );
};

await emit(
  "src/render-probe/profile.ts",
  `import { AsyncLocalStorage } from "node:async_hooks";
import type { APIContext, MiddlewareHandler } from "astro";
type Counter = { calls: number; ms: number; maxMs: number };
type Trace = { start: number; counters: Record<string, Counter>; phases: { name: string; ms: number }[] };
const storage = new AsyncLocalStorage<Trace>();
let outside: Record<string, Counter> = {};
export function timed<T>(name: string, run: () => Promise<T>): Promise<T> {
  const counters = storage.getStore()?.counters ?? outside;
  const start = performance.now();
  return run().finally(() => {
    const elapsed = performance.now() - start;
    const counter = counters[name] ??= { calls: 0, ms: 0, maxMs: 0 };
    counter.calls++; counter.ms += elapsed; counter.maxMs = Math.max(counter.maxMs, elapsed);
  });
}
export function phases(prefix: string) {
  const trace = storage.getStore();
  let last = performance.now();
  return (name: string) => {
    const now = performance.now();
    trace?.phases.push({ name: prefix + ":" + name, ms: now - last });
    last = now;
  };
}
export async function profileRequest(ctx: APIContext, next: () => ReturnType<MiddlewareHandler>) {
  const invokeNext = async () => {
    const response = await next();
    if (!response) throw new Error("Diagnostic middleware expected a Response");
    return response;
  };
  if ((ctx.isPrerendered && !import.meta.env.DEV) || ctx.request.headers.get("x-render-profile") === "off") return invokeNext();
  const outsideBeforeRequest = outside;
  outside = {};
  const trace: Trace = { start: performance.now(), counters: {}, phases: [] };
  return storage.run(trace, async () => {
    const response = await invokeNext();
    // Buffer ONLY this diagnostic copy to include the complete streamed render.
    const bytes = await response.arrayBuffer();
    const totalMs = performance.now() - trace.start;
    const result = new Response(bytes, response);
    result.headers.set("Cache-Control", "no-store");
    result.headers.set("Server-Timing", "probe;dur=" + totalMs.toFixed(3));
    console.log("[render-profile] " + JSON.stringify({ path: ctx.url.pathname, totalMs, bytes: bytes.byteLength, counters: trace.counters, outsideBeforeRequest, phases: trace.phases }));
    return result;
  });
}
`,
);
await emit(
  "src/render-probe/content.ts",
  `import { getCollection as realCollection, getEntry as realEntry } from "astro:content";
import { timed } from "./profile";
export type { CollectionEntry } from "astro:content";
export const getCollection = new Proxy(realCollection, {
  apply(target, receiver, args) {
    return timed("getCollection:" + args[0], () => Reflect.apply(target, receiver, args));
  },
});
export const getEntry = new Proxy(realEntry, {
  apply(target, receiver, args) {
    const collection = typeof args[0] === "string" ? args[0] : args[0].collection;
    return timed("getEntry:" + collection, () => Reflect.apply(target, receiver, args));
  },
});
`,
);
const files = [
  "src/content-utils.ts",
  "src/components/logo.astro",
  "src/components/team-stats/ui.astro",
  "src/components/team-stats/index.astro",
  "src/components/team-stats/ssr.astro",
  "src/components/standings-table/ui.astro",
  "src/components/standings-table/index.astro",
  "src/components/standings-table/ssr.astro",
  "src/pages/stats.astro",
  "src/pages/[seasonId]/[teamId].astro",
  "src/pages/[seasonId]/index.astro",
  "src/actions/index.ts",
];
for (const file of files) {
  let relative = path
    .relative(path.dirname(file), "src/render-probe/content")
    .replaceAll(path.sep, "/");
  if (!relative.startsWith(".")) relative = "./" + relative;
  const text = await readFile(path.join(root, file), "utf8");
  await emit(
    file,
    text.replaceAll('from "astro:content"', () => 'from "' + relative + '"'),
  );
}
await replace(
  "src/middleware.ts",
  "export const onRequest =",
  "const originalOnRequest =",
);
const middleware = await readFile(path.join(root, "src/middleware.ts"), "utf8");
await emit(
  "src/middleware.ts",
  'import { profileRequest } from "./render-probe/profile";\n' +
    middleware +
    "\nexport const onRequest = defineMiddleware((ctx, next) => profileRequest(ctx, () => originalOnRequest(ctx, next)));\n",
);

await replace(
  "src/pages/stats.astro",
  "const archivedSeasons =",
  'const mark = (await import("../render-probe/profile")).phases("stats");\nconst archivedSeasons =',
);
for (const [marker, label] of [
  ["// All-time Top 10 Table", "initial collections"],
  ["// END All-time Top 10 Table", "top ten"],
  ["// END Surprises per Season chart", "per season"],
  ["// END Surprises by Team chart", "by team"],
  ["// END Team Season scatterplot", "scatter"],
]) {
  await replace(
    "src/pages/stats.astro",
    marker,
    'mark("' + label + '");\n' + marker,
  );
}
await replace(
  "src/components/team-stats/ui.astro",
  "const record =",
  'const mark = (await import("../../render-probe/profile")).phases("team-ui");\nconst record =',
);
await replace(
  "src/components/team-stats/ui.astro",
  "const datapoints:",
  'mark("summary helpers");\nconst datapoints:',
);
await replace(
  "src/components/team-stats/ui.astro",
  "}\n---",
  '}\nmark("chart points");\n---',
);

// A complete archived candidate-season fixture, not an NBA response or a KV hit.
const games = JSON.parse(
  await readFile(path.join(root, "src/content/games.json"), "utf8"),
).filter((game) => game.seasonId === "2025");
assert.equal(
  games.filter((game) => game.teams.some((team) => team.teamId === "CHA"))
    .length,
  82,
);
await emit("src/render-probe/games.json", JSON.stringify(games));
/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- These are generated Astro attributes, not JS substitutions. */
await emit(
  "src/render-probe/ProbeTeamStats.astro",
  `---
import { getEntry } from "./content";
import type { GameData } from "../content-utils";
import UI from "../components/team-stats/ui.astro";
import fixture from "./games.json";
Astro.response.headers.set("Cache-Control", "no-store");
const teamSeason = await getEntry("teamSeasons", "2025/CHA");
if (!teamSeason) throw new Error("Missing fixture team season");
// Generated from the validated archive; JSON imports widen team codes to string.
const games = fixture as GameData[];
---
<UI games={games} teamSeason={teamSeason} />
`,
);
/* eslint-enable unicorn/no-incorrect-template-string-interpolation */
await emit(
  "src/pages/render-probe.astro",
  `---
import Subpage from "../layouts/subpage.astro";
import ProbeTeamStats from "../render-probe/ProbeTeamStats.astro";
---
<Subpage title="Deferred render diagnostic">
  <h1>Archived-data server-island probe</h1>
  <p>2025 Charlotte, 82 games. Local fixture only: no NBA or KV access. Not live data.</p>
  <ProbeTeamStats server:defer>
    <p slot="fallback" data-probe-loading>Waiting for archived fixture island…</p>
  </ProbeTeamStats>
</Subpage>
`,
);
console.log(
  `Prepared diagnostic copy at ${root}; fixture has ${games.length} season games.`,
);

#!/usr/bin/env node
/*
  Compare two capture runs: size deltas per page + pixel diffs per screenshot.
  usage: compare.mjs --a <runDirA> --b <runDirB>
*/
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import Path from "node:path";
import { parseArgs } from "node:util";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const { values: args } = parseArgs({
  options: { a: { type: "string" }, b: { type: "string" } },
});
if (!args.a || !args.b) {
  console.error("usage: compare.mjs --a <runDirA> --b <runDirB>");
  process.exit(1);
}

const load = async (dir) =>
  JSON.parse(await readFile(Path.join(dir, "summary.json"), "utf8"));
const a = await load(args.a);
const b = await load(args.b);

const byPage = (s) => Object.fromEntries(s.pages.map((p) => [p.page, p]));
const pa = byPage(a);
const pb = byPage(b);

const delta = (x, y) => {
  if (x === undefined || y === undefined) return "n/a";
  const d = y - x;
  const pct = x === 0 ? "" : ` (${((d / x) * 100).toFixed(1)}%)`;
  return `${d >= 0 ? "+" : ""}${d}${pct}`;
};

console.log(`A: ${a.label} (${a.base})\nB: ${b.label} (${b.base})\n`);
console.log(
  "| page | status A/B | html Δ | JS Δ | CSS Δ | total Δ | ext scripts A/B | islands A/B |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
const pages = new Set([...Object.keys(pa), ...Object.keys(pb)]);
for (const page of pages) {
  const x = pa[page];
  const y = pb[page];
  console.log(
    `| ${page} | ${x?.status ?? "-"}/${y?.status ?? "-"} | ${delta(x?.htmlBytes, y?.htmlBytes)} | ${delta(x?.jsBytes, y?.jsBytes)} | ${delta(x?.cssBytes, y?.cssBytes)} | ${delta(x?.loadedBytes, y?.loadedBytes)} | ${x?.scripts.length ?? "-"}/${y?.scripts.length ?? "-"} | ${x?.serverIslands.length ?? "-"}/${y?.serverIslands.length ?? "-"} |`,
  );
}

// Screenshots
const screensA = Path.join(args.a, "screens");
const screensB = Path.join(args.b, "screens");
const diffDir = Path.join(args.b, "diff");
await mkdir(diffDir, { recursive: true });

const filesA = new Set(await readdir(screensA).catch(() => []));
const filesB = await readdir(screensB).catch(() => []);

const pad = (png, width, height) => {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ height, width });
  out.data.fill(0);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
};

console.log("\n| screenshot | size A | size B | diff px | diff % |");
console.log("| --- | --- | --- | --- | --- |");
const sortedB = filesB.toSorted((a, b) => a.localeCompare(b));
for (const file of sortedB) {
  if (!filesA.has(file)) {
    console.log(`| ${file} | missing | ${file} | - | - |`);
    continue;
  }
  const imgA = PNG.sync.read(await readFile(Path.join(screensA, file)));
  const imgB = PNG.sync.read(await readFile(Path.join(screensB, file)));
  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);
  const A = pad(imgA, width, height);
  const B = pad(imgB, width, height);
  const diff = new PNG({ height, width });
  const changed = pixelmatch(A.data, B.data, diff.data, width, height, {
    threshold: 0.1,
  });
  const pct = ((changed / (width * height)) * 100).toFixed(2);
  if (changed > 0) {
    await writeFile(Path.join(diffDir, file), PNG.sync.write(diff));
  }
  console.log(
    `| ${file} | ${imgA.width}x${imgA.height} | ${imgB.width}x${imgB.height} | ${changed} | ${pct}% |`,
  );
}
console.log(`\ndiff images (where any) in ${diffDir}`);

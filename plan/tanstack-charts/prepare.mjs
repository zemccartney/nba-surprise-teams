import console from "node:console";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { fileURLToPath, URL } from "node:url";

const source = fileURLToPath(new URL("./", import.meta.url));
const built = fileURLToPath(new URL("../../dist/client/", import.meta.url));
const fixtures = {};
for (const page of ["stats", "2025/CHA"]) {
  const html = readFileSync(Path.join(built, page, "index.html"), "utf8");
  for (const [, kind, data] of html.matchAll(
    /data-chart="([^"]+)"[^>]*>\s*<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/g,
  )) {
    fixtures[kind] = JSON.parse(data);
  }
}
if (Object.keys(fixtures).length !== 4)
  throw new Error(
    "Build the application first; expected all four chart payloads",
  );
const output = mkdtempSync(Path.join(tmpdir(), "nbastt-tanstack-"));
for (const name of [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "main.ts.template",
  "tsconfig.json.template",
]) {
  copyFileSync(
    Path.join(source, name),
    Path.join(output, name.replace(/\.template$/, "")),
  );
}
const json = JSON.stringify(fixtures).replaceAll("<", String.raw`\u003c`);
writeFileSync(Path.join(output, "fixtures.json"), json);
writeFileSync(
  Path.join(output, "index.html"),
  readFileSync(Path.join(source, "index.html.template"), "utf8").replace(
    "__FIXTURES__",
    () => json,
  ),
);
const assets = Path.join(output, "public/_astro");
mkdirSync(assets, { recursive: true });
const assetNames = readdirSync(Path.join(built, "_astro"));
for (const name of assetNames) {
  if (name.endsWith(".svg"))
    copyFileSync(Path.join(built, "_astro", name), Path.join(assets, name));
}
console.log(output);

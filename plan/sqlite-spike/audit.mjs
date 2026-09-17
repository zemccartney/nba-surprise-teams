import assert from "node:assert/strict";
import console from "node:console";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? "dist");
const files = await readdir(root, { recursive: true });
const reports = files.filter((file) =>
  /sqlite-pilot-audit-.*\.json$/.test(file),
);
for (const environment of ["ssr", "client"])
  assert.ok(
    reports.includes(`sqlite-pilot-audit-${environment}.json`),
    `Missing ${environment} graph audit; this is not a complete audited pilot build`,
  );
const forbidden =
  /(?:node:sqlite|SQLITE_PILOT_NODE_ONLY|sqlite-spike\/database\.ts)/;
for (const filename of reports) {
  const reportPath = path.join(root, filename);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert.deepEqual(report.forbiddenMatches, []);
  assert.ok(report.chunks.length > 0);
  if (report.environment === "ssr")
    assert.ok(
      report.modules.some((id) => id.includes("sqlite-pilot:catalog")),
      "Worker did not include the embedded catalog",
    );
  assert.equal(
    forbidden.test(JSON.stringify([report.modules, report.imports])),
    false,
  );
  for (const chunk of report.chunks) {
    const file = path.resolve(path.dirname(reportPath), chunk.file);
    assert.ok(
      file.startsWith(path.dirname(reportPath) + path.sep),
      "Invalid audit file path",
    );
    const bytes = await readFile(file);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      chunk.sha256,
      `Changed artifact: ${file}`,
    );
    assert.equal(
      forbidden.test(bytes.toString("utf8")),
      false,
      `SQLite reference in ${file}`,
    );
  }
  console.log(
    `${report.environment}: ${report.chunks.length} chunk hashes verified; no SQLite machinery in graph or emitted JS`,
  );
}
for (const file of files) {
  if (!/^(?:client|server)\//.test(file)) continue;
  assert.equal(
    /\.(?:db|sqlite|sqlite3|sql)$/.test(file),
    false,
    `Database artifact shipped: ${file}`,
  );
  if (/\.(?:html|mjs|js|map)$/.test(file))
    assert.equal(
      forbidden.test(await readFile(path.join(root, file), "utf8")),
      false,
      `SQLite reference in final artifact ${file}`,
    );
}
console.log(
  "Final HTML/JS/source maps also scanned; no DB or SQL dump files shipped. Scope: Worker/browser artifacts, not Node prerender tooling. Legacy Astro content remains.",
);

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "current-base": { default: "http://127.0.0.1:4328", type: "string" },
    "current-log": {
      default: "/tmp/nbastt-frontmatter-current.log",
      type: "string",
    },
    "old-base": { default: "http://127.0.0.1:4327", type: "string" },
    "old-log": { default: "/tmp/nbastt-frontmatter-old.log", type: "string" },
    out: { type: "string" },
    paths: { default: "/stats/,/2025/CHA/", type: "string" },
  },
});
assert.ok(values.out, "Supply a new --out JSON file");
// Reserve the output first; never overwrite an earlier run.
await writeFile(values.out, "Capture incomplete\n", { flag: "wx" });
const rows = [];
const paths = values.paths.split(",");
assert.ok(
  paths.every((pathname) => ["/2025/CHA/", "/stats/"].includes(pathname)),
);
for (const pathname of paths) {
  for (let run = 0; run <= 5; run++) {
    // Alternate order to avoid systematically measuring one stack first.
    const order = run % 2 === 0 ? ["old", "current"] : ["current", "old"];
    for (const stack of order) {
      const id = `${stack}-${pathname.replaceAll("/", "_")}-${run}`;
      const logPath = values[`${stack}-log`];
      const previousLog = await readFile(logPath, "utf8");
      const before = previousLog.length;
      const url = new URL(pathname, values[`${stack}-base`]);
      url.searchParams.set("__profile", id);
      const response = spawnSync(
        "curl",
        [
          "--fail",
          "--silent",
          "--show-error",
          "--max-time",
          "45",
          "--header",
          `x-frontmatter-profile: ${id}`,
          "--output",
          "/dev/null",
          "--write-out",
          "%{json}",
          url.href,
        ],
        { encoding: "utf8" },
      );
      assert.equal(response.status, 0, response.stderr);
      const timing = JSON.parse(response.stdout);
      assert.equal(timing.http_code, 200);
      await setTimeout(150); // Let forwarded Worker console messages reach the log.
      const currentLog = await readFile(logPath, "utf8");
      const text = currentLog.slice(before);
      const events = text
        .matchAll(/\[frontmatter-profile\] (\{[^\n]+\})/g)
        .map((match) => JSON.parse(match[1]))
        .toArray();
      const requests = new Set(
        events.map((event) => event.request).filter(Boolean),
      );
      assert.equal(
        requests.size,
        1,
        `Expected one server-labelled request in ${id}`,
      );
      assert.ok(
        events.every((event) => event.path === pathname || event.path === null),
        "Other route contaminated capture; rerun serially",
      );
      const expected =
        pathname === "/stats/"
          ? ["stats"]
          : ["team-page", "team-index", "team-ui"];
      for (const name of expected)
        assert.equal(
          events.filter((event) => event.name === name).length,
          1,
          `Missing or repeated ${name}`,
        );
      const row = {
        events,
        firstByteMs: timing.time_starttransfer * 1000,
        firstRouteVisit: run === 0,
        htmlBytes: timing.size_download,
        id,
        pathname,
        run,
        stack,
        totalMs: timing.time_total * 1000,
      };
      rows.push(row);
      console.log(
        `${id}: TTFB ${row.firstByteMs.toFixed(1)} ms; ${events.map((event) => `${event.name}=${event.ms.toFixed(1)}`).join(", ")}`,
      );
    }
  }
}
await writeFile(
  values.out,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      notes: [
        "Serial curl requests, no browser JS or fonts.",
        "Run zero retained separately from five warm repeats.",
        "getStaticPaths has no request context; null-labelled events belong to the serial capture interval, not a framework request span.",
        "Frontmatter excludes static imports and template/child rendering. Do not sum potentially overlapping component spans.",
      ],
      rows,
      settings: values,
    },
    undefined,
    2,
  ) + "\n",
);

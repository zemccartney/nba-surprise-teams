import { dev } from "astro";
import assert from "node:assert/strict";

// Real app regression for Astro #18387. Run separately from dev/build/Vitest:
// a first island page must not prevent discovery of another island later.
// Fetching page HTML does not execute browser island requests or contact NBA.
for (const routes of [
  ["/", "/2026/showdown/"],
  ["/2026/showdown/", "/"],
]) {
  const server = await dev({
    logLevel: "silent",
    server: { host: "127.0.0.1", port: 0 },
  });
  try {
    for (const route of routes) {
      const response = await fetch(
        `http://127.0.0.1:${server.address.port}${route}`,
        {
          signal: AbortSignal.timeout(30_000),
        },
      );
      assert.equal(
        response.status,
        200,
        `Failed request order ${routes.join(" → ")}: ${route}`,
      );
      assert.match(await response.text(), /\/_server-islands\//);
    }
    console.log(`PASS island discovery: ${routes.join(" → ")}`);
  } finally {
    await server.stop();
  }
}

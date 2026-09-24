// Controlled cold-load comparison of real static builds, not a Lighthouse score.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const [variantsFile, output, path = "/stats/"] = process.argv.slice(2);
if (!variantsFile || !output)
  throw new Error(
    "Usage: node chart-paint-network.mjs <variants.json> <output.json> [path]",
  );
const variants = JSON.parse(readFileSync(variantsFile, "utf8"));
const network = {
  connectionType: "cellular4g",
  downloadThroughput: 200_000,
  latency: 150,
  offline: false,
  uploadThroughput: 93_750,
};
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  for (let run = 0; run < 3; run++) {
    // Rotate order rather than finishing all samples of one variant first.
    for (const variant of [...variants.slice(run), ...variants.slice(0, run)]) {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        viewport: { height: 1000, width: 390 },
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Network.emulateNetworkConditions", network);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.addInitScript(() => {
          Object.assign(globalThis, { paintProbe: { cls: 0, lcp: 0 } });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              globalThis.paintProbe.lcp = entry.startTime;
          }).observe({ buffered: true, type: "largest-contentful-paint" });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput)
                globalThis.paintProbe.cls += entry.value;
          }).observe({ buffered: true, type: "layout-shift" });
        });
        await page.goto(new URL(path, variant.base).href, {
          waitUntil: "load",
        });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        });
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({
          ...globalThis.paintProbe,
          document: performance.getEntriesByType("navigation").map((entry) => ({
            encoded: entry.encodedBodySize,
            end: entry.responseEnd,
          })),
          fcp: performance.getEntriesByName("first-contentful-paint")[0]
            ?.startTime,
          overflow: document.documentElement.scrollWidth > innerWidth,
          resources: performance.getEntriesByType("resource").map((entry) => ({
            encoded: entry.encodedBodySize,
            end: entry.responseEnd,
            name: new URL(entry.name).pathname,
            start: entry.startTime,
          })),
        }));
        const result = { errors, run, variant: variant.name, ...metrics };
        results.push(result);
        console.log(
          JSON.stringify({
            cls: metrics.cls,
            fcp: metrics.fcp,
            lcp: metrics.lcp,
            run,
            variant: variant.name,
          }),
        );
      } finally {
        await context.close();
      }
    }
  }
  writeFileSync(
    output,
    JSON.stringify(
      {
        browser: browser.version(),
        cpuSlowdown: 4,
        network,
        note: "Three rotated cold-context runs per real build, cache disabled, local gzip HTTP. No Sentry integration in these builds. CDP throttling is not Lighthouse's simulated model; results are not a PSI score or chart-interactivity metric. Does not measure repeat-navigation caching benefits.",
        path,
        results,
      },
      undefined,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}

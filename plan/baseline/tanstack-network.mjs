import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
const [label, base, target, output] = process.argv.slice(2);
if (!label || !base || !target || !output)
  throw new Error(
    "Usage: node tanstack-network.mjs <label> <base-url> <svg-selector> <report.json>",
  );
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
const network = {
  connectionType: "cellular4g",
  downloadThroughput: 1_012_500,
  latency: 165,
  offline: false,
  uploadThroughput: 168_750,
};
try {
  for (let run = 0; run < 3; run++) {
    const kind = label,
      selector = target,
      url = base;
    const context = await browser.newContext({
      viewport: { height: 1000, width: 1440 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", network);
    await page.addInitScript((sel) => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector(sel)) {
          return;
        }

        observer.disconnect();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            Object.assign(globalThis, { chartReady: performance.now() });
          }),
        );
      });
      observer.observe(document, { childList: true, subtree: true });
    }, selector);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => globalThis.chartReady);
    await page.waitForTimeout(200);
    results.push({
      kind,
      run,
      ...(await page.evaluate(() => ({
        js: performance
          .getEntriesByType("resource")
          .filter((x) => new URL(x.name).pathname.endsWith(".js"))
          .map((x) => ({
            decoded: x.decodedBodySize,
            encoded: x.encodedBodySize,
            end: x.responseEnd,
            firstByte: x.responseStart,
            ms: x.duration,
            name: new URL(x.name).pathname,
            request: x.requestStart,
            start: x.startTime,
          })),
        ready: globalThis.chartReady,
      }))),
    });
    await context.close();
  }
  writeFileSync(
    output,
    JSON.stringify(
      {
        browser: browser.version(),
        network,
        note: "Diagnostic only. First SVG plus two animation frames, not animation completion. Counts completed .js resource URLs; excludes .ts entries and HMR client URLs. Full site and simplified prototype differ in fonts/layout/animation. Never interpret as an exact-parity speedup.",
        results,
      },
      undefined,
      2,
    ) + "\n",
  );
  console.log(
    results.map((r) => ({
      js: r.js,
      jsBytes: r.js.reduce((n, x) => n + x.encoded, 0),
      kind: r.kind,
      ready: r.ready,
      run: r.run,
    })),
  );
} finally {
  await browser.close();
}

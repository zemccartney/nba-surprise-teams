import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Path from "node:path";
import { parseArgs } from "node:util";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

const { values } = parseArgs({
  options: {
    dev: { type: "string" },
    out: { type: "string" },
    preview: { type: "string" },
    reference: { type: "string" },
  },
});
assert.ok(
  values.dev && values.preview && values.reference && values.out,
  "Supply --dev, --preview, --reference and a new --out directory",
);
await mkdir(values.out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const reports = [];
const diffs = [];
try {
  for (const width of [1440, 390]) {
    for (const route of [
      "/",
      "/archive/",
      "/stats/",
      "/2025/CHA/",
      "/2011/CHA/",
      "/about/",
      "/missing-review-route/",
    ]) {
      const key =
        (route === "/" ? "home" : route.replaceAll("/", "_")) + "-" + width;
      for (const [mode, base] of [
        ["reference", values.reference],
        ["preview", values.preview],
        ["dev", values.dev],
      ]) {
        const context = await browser.newContext({
          reducedMotion: "reduce",
          viewport: { height: 900, width },
        });
        const page = await context.newPage();
        const errors = [],
          failed = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
        });
        page.on("requestfailed", (request) => {
          failed.push(request.url());
        });
        const response = await page.goto(base + route, {
          waitUntil: "networkidle",
        });
        assert.equal(
          response.status(),
          route.includes("missing-review") ? 404 : 200,
        );
        await page.evaluate(() => document.fonts.ready);
        const charts = await page.locator("[data-chart]").all();
        for (const chart of charts) {
          await chart.scrollIntoViewIfNeeded();
          await chart.locator("svg").first().waitFor();
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(300);
        const info = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          return {
            charts: document.querySelectorAll("[data-chart]").length,
            domContentLoaded: nav.domContentLoadedEventEnd,
            fcp: performance.getEntriesByName("first-contentful-paint")[0]
              ?.startTime,
            fonts: performance
              .getEntriesByType("resource")
              .filter((entry) => entry.name.includes("woff"))
              .map((entry) => ({
                duration: entry.duration,
                url: new URL(entry.name).pathname,
              })),
            overflow: document.documentElement.scrollWidth > innerWidth,
            ttfb: nav.responseStart,
          };
        });
        assert.equal(
          info.overflow,
          false,
          `${mode} ${route} horizontal overflow`,
        );
        assert.deepEqual(errors, []);
        assert.deepEqual(failed, []);
        await page.screenshot({
          fullPage: true,
          path: Path.join(values.out, `${key}-${mode}.png`),
        });
        reports.push({ mode, route, width, ...info, errors, failed });
        await context.close();
      }
      const a = PNG.sync.read(
        await readFile(Path.join(values.out, `${key}-reference.png`)),
      );
      const b = PNG.sync.read(
        await readFile(Path.join(values.out, `${key}-preview.png`)),
      );
      assert.equal(a.width, b.width);
      assert.equal(a.height, b.height);
      const diff = new PNG({ height: a.height, width: a.width });
      const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
        threshold: 0.1,
      });
      if (pixels)
        await writeFile(
          Path.join(values.out, `${key}-diff.png`),
          PNG.sync.write(diff),
        );
      diffs.push({ pixels, route, width });
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  Path.join(values.out, "browser.json"),
  JSON.stringify({ diffs, reports }, undefined, 2) + "\n",
  { flag: "wx" },
);
console.log(diffs);

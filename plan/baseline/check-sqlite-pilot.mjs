import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values } = parseArgs({
  options: {
    baseline: { default: "http://127.0.0.1:4322", type: "string" },
    dev: { default: "http://127.0.0.1:4329", type: "string" },
    "dev-odds": { default: "missing", type: "string" },
    out: { type: "string" },
    preview: { default: "http://127.0.0.1:4330", type: "string" },
    "preview-odds": { default: "missing", type: "string" },
    runs: { default: "5", type: "string" },
  },
});
// Scope attributes and asset URLs vary between parent components/dev/build.
// Compare the complete domain/chart contract, not Astro's incidental props.
const chartContract = ({ data, surpriseRules, winsToSurprise }) => ({
  data,
  surpriseRules,
  winsToSurprise,
});
const browser = await chromium.launch({ channel: "chrome" });
const results = {
  browser: browser.version(),
  checks: [],
  conditions:
    "1440×900, normal motion, first visit then warm reloads; chart readiness is slider + two frames, NOT animation completion",
};
try {
  const referencePage = await browser.newPage();
  await referencePage.goto(`${values.baseline}/2025/CHA/`);
  const reference = JSON.parse(
    await referencePage
      .locator('[data-chart] script[type="application/json"]')
      .textContent(),
  );
  assert.equal(reference.data.length, 82);
  await referencePage.close();
  for (const environment of ["preview", "dev"]) {
    for (const mode of ["archive", "island"]) {
      const context = await browser.newContext({
        viewport: { height: 900, width: 1440 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      let response;
      page.on("response", (entry) => {
        if (entry.url().includes("/_server-islands/")) response = entry;
      });
      for (let visit = 0; visit <= Number(values.runs); visit++) {
        response = undefined;
        const url = `${values[environment]}/sqlite-spike/${mode}/`;
        const navigation =
          visit === 0 ? await page.goto(url) : await page.reload();
        assert.equal(navigation.status(), 200);
        await page.locator("[data-chart]").scrollIntoViewIfNeeded();
        const chart = page.locator('[data-chart][role="slider"]');
        await chart.waitFor();
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const timing = await page.evaluate(() => {
          const navigation = performance.getEntriesByType("navigation")[0];
          return {
            chartFrameMs: performance.now(),
            documentTTFBMs: navigation.responseStart - navigation.requestStart,
          };
        });
        const panel = page.locator("[data-sqlite-pilot]");
        assert.equal(
          await panel.getAttribute("data-backend"),
          mode === "archive" ? "sqlite" : "embedded metadata",
        );
        assert.equal(
          await panel.getAttribute("data-latest-odds"),
          values[`${environment}-odds`],
        );
        const actual = JSON.parse(
          await chart.locator('script[type="application/json"]').textContent(),
        );
        assert.deepEqual(chartContract(actual), chartContract(reference));
        assert.match(actual.surprisedEmojiSrc, /hushed-face[./]/);
        assert.equal(await page.locator("[data-pilot-loading]").count(), 0);
        await chart.focus();
        await page.keyboard.press("End");
        assert.equal(
          await chart.getAttribute("aria-valuenow"),
          await chart.getAttribute("aria-valuemax"),
        );
        assert.ok(await chart.getAttribute("aria-valuetext"));
        let islandMs;
        if (mode === "island") {
          assert.ok(response);
          assert.equal(response.status(), 200);
          const headers = await response.allHeaders();
          assert.match(headers["cache-control"], /no-store/);
          await response.finished();
          const requestTiming = response.request().timing();
          islandMs = requestTiming.responseEnd - requestTiming.requestStart;
        }
        results.checks.push({
          environment,
          mode,
          visit,
          ...timing,
          ...(islandMs !== undefined && { islandMs }),
        });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (values.out)
  await writeFile(values.out, JSON.stringify(results, undefined, 2) + "\n", {
    flag: "wx",
  });
console.log(JSON.stringify(results, undefined, 2));

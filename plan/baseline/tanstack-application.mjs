import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { chromium } from "playwright-core";
const [base, output] = process.argv.slice(2);
if (!base || !output)
  throw new Error(
    "Usage: node tanstack-application.mjs <base-url> <output-directory>",
  );
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const reports = [];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      reducedMotion: "reduce",
      viewport: { height: 1000, width },
    });
    const errors = [];
    const scripts = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
    });
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") scripts.push(r.url());
    });
    for (const [path, kinds] of [
      [
        "/stats/",
        ["surprises-per-season", "surprises-by-team", "team-season-scatter"],
      ],
      ["/2025/CHA/", ["team-season-pace"]],
    ]) {
      await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
      for (const kind of kinds) {
        const host = page.locator(`[data-chart="${kind}"]`);
        await host.scrollIntoViewIfNeeded();
        await host.focus();
        const svg = host.locator('svg[data-renderer="tanstack"]').first();
        await svg.waitFor();
        await svg.focus();
        await page.keyboard.press("Home");
        await page.waitForTimeout(50);
        const first = await host.locator(".tracker-tooltip").textContent();
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(50);
        const next = await host.locator(".tracker-tooltip").textContent();
        assert.notEqual(first, next, kind);
        await page.keyboard.press("End");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(30);
        assert.equal(await host.locator('[role="dialog"]').isVisible(), true);
        await page.keyboard.press("Escape");
        assert.equal(await host.locator('[role="dialog"]').isVisible(), false);
        await svg.blur();
        await page.mouse.move(0, 0);
        await host.screenshot({
          path: Path.join(output, `${kind}-${width}.png`),
        });
        if (kind === "team-season-pace") {
          assert.equal(
            await host.locator("svg image").getAttribute("aria-label"),
            "Surprise threshold: 38 wins",
          );
        }
        assert.equal(await host.locator("img:not([alt])").count(), 0);
        reports.push({
          first,
          kind,
          next,
          svg: await svg.boundingBox(),
          width,
        });
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    // Resize an already mounted chart; its library-owned redraw must retain the annotation.
    await page.setViewportSize({
      height: 1000,
      width: width === 1440 ? 390 : 1440,
    });
    await page.waitForTimeout(250);
    const resized = page.locator(
      '[data-chart="team-season-pace"] svg[data-renderer="tanstack"]',
    );
    assert.equal(
      await resized.locator("image").getAttribute("aria-label"),
      "Surprise threshold: 38 wins",
    );
    await resized.focus();
    await page.keyboard.press("Home");
    assert.equal(await resized.locator("image").count(), 1);
    assert.deepEqual(errors, []);
    assert.ok(scripts.every((s) => !s.includes("/echarts.")));
    await page.close();
  }
  writeFileSync(
    Path.join(output, "checks.json"),
    JSON.stringify(reports, undefined, 2),
  );
  console.log(reports);
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const [base] = process.argv.slice(2);
if (!base) throw new Error("Usage: node tanstack-resilience.mjs <base-url>");
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const mode of ["blocked", "stalled"]) {
    for (const path of ["/stats/", "/2025/CHA/"]) {
      const page = await browser.newPage({
        viewport: { height: 900, width: 390 },
      });
      const releases = [];
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      await page.route(/\.woff2?(?:\?|$)/, async (route) => {
        if (mode === "stalled")
          await new Promise((resolve) => {
            releases.push(resolve);
          });
        await route.abort();
      });
      try {
        await page.goto(new URL(path, base).href, {
          waitUntil: "domcontentloaded",
        });
        const hosts = page.locator("[data-chart]");
        assert.equal(await hosts.count(), path === "/stats/" ? 3 : 1);
        const charts = await hosts.all();
        for (const host of charts) {
          await host.scrollIntoViewIfNeeded();
          await host.focus();
          const svg = host.locator('svg[data-renderer="tanstack"]').first();
          await svg.waitFor({ timeout: 10_000 });
          await svg.focus();
          await page.keyboard.press("Home");
          const first = await host.locator(".tracker-tooltip").textContent();
          await page.keyboard.press("End");
          assert.notEqual(
            await host.locator(".tracker-tooltip").textContent(),
            first,
          );
          await page.keyboard.press("Escape");
          assert.equal(
            await host.locator('[role="dialog"]').isVisible(),
            false,
          );
          assert.notEqual(await host.getAttribute("role"), "alert");
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.deepEqual(errors, []);
      } finally {
        for (const release of releases) release();
        await page.unrouteAll({ behavior: "wait" });
        await page.close();
      }
      console.log(`PASS: ${path} renders and navigates with ${mode} fonts`);
    }
  }
} finally {
  await browser.close();
}

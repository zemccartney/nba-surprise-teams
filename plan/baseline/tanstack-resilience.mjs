import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const [base] = process.argv.slice(2);
if (!base) throw new Error("Usage: node tanstack-resilience.mjs <base-url>");
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const mode of ["blocked", "stalled", "delayed"]) {
    for (const path of ["/stats/", "/2025/CHA/"]) {
      const page = await browser.newPage({
        viewport: { height: 900, width: 390 },
      });
      const releases = [];
      let areFontsReleased = false;
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      await page.addInitScript(() => {
        // Test-only instrumentation: observe native measurement and font recovery.
        const probe = { completed: 0, fontLoads: 0, measures: 0 };
        Object.defineProperty(globalThis, "__chartFonts", { value: probe });
        const measure = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = new Proxy(measure, {
          apply(target, receiver, args) {
            probe.measures++;
            return Reflect.apply(target, receiver, args);
          },
        });
        const load = document.fonts.load.bind(document.fonts);
        document.fonts.load = (...args) => {
          probe.fontLoads++;
          return load(...args);
        };
        document.fonts.addEventListener("loadingdone", () => {
          probe.completed++;
        });
      });
      await page.route(/\.woff2?(?:\?|$)/, async (route) => {
        if (mode !== "blocked" && !areFontsReleased)
          await new Promise((resolve) => {
            releases.push(resolve);
          });
        if (mode === "delayed") await route.continue();
        else await route.abort();
      });
      try {
        await page.goto(new URL(path, base).href, {
          waitUntil: "domcontentloaded",
        });
        const hosts = page.locator("[data-chart]");
        assert.equal(await hosts.count(), path === "/stats/" ? 3 : 1);
        const charts = await hosts.all();
        const previousPoints = [];
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
          await page.keyboard.press("ArrowLeft");
          previousPoints.push(
            await host.locator(".tracker-tooltip").textContent(),
          );
          await page.keyboard.press("End");
          await page.keyboard.press("Escape");
          assert.equal(
            await host.locator('[role="dialog"]').isVisible(),
            false,
          );
          assert.notEqual(await host.getAttribute("role"), "alert");
        }
        assert.equal(
          await page.evaluate(() => globalThis.__chartFonts.fontLoads),
          0,
        );
        if (mode !== "blocked") {
          assert.ok(releases.length > 0);
          assert.equal(
            await page.evaluate(() => document.fonts.status),
            "loading",
          );
        }
        if (mode === "delayed") {
          const before = await page.evaluate(() => ({
            ...globalThis.__chartFonts,
          }));
          assert.ok(
            before.measures > 0,
            "charts measured and rendered before fonts were released",
          );
          areFontsReleased = true;
          for (const release of releases) release();
          await page.waitForFunction(
            (before) =>
              document.fonts.status === "loaded" &&
              globalThis.__chartFonts.completed > before.completed &&
              globalThis.__chartFonts.measures > before.measures,
            before,
          );
          assert.equal(
            await page.evaluate(() =>
              ["400", "700"].every((weight) =>
                [...document.fonts].some(
                  (face) =>
                    face.family.includes("Iosevka Curly") &&
                    face.weight === weight &&
                    face.status === "loaded",
                ),
              ),
            ),
            true,
          );
          assert.equal(
            await page.evaluate(() =>
              document.activeElement?.matches('svg[data-renderer="tanstack"]'),
            ),
            true,
          );
          await page.keyboard.press("ArrowLeft");
          assert.equal(
            await charts.at(-1).locator(".tracker-tooltip").textContent(),
            previousPoints.at(-1),
            "font redraw preserves the selected game/point, not only SVG focus",
          );
          for (const host of charts) {
            const bounds = await host.boundingBox();
            const labels = await host
              .locator('[data-ts-key^="x-tick-label:"]')
              .evaluateAll((nodes) =>
                nodes.map((node) => ({
                  left: node.getBoundingClientRect().left,
                  right: node.getBoundingClientRect().right,
                })),
              );
            assert.ok(bounds);
            for (const label of labels) {
              assert.ok(label.left >= bounds.x - 1);
              assert.ok(label.right <= bounds.x + bounds.width + 1);
            }
          }
          await page.setViewportSize({ height: 900, width: 1440 });
          await page.waitForTimeout(200);
          const lastSvg = charts
            .at(-1)
            .locator('svg[data-renderer="tanstack"]')
            .first();
          await lastSvg.focus();
          await page.keyboard.press("Home");
          assert.equal(
            await charts.at(-1).locator(".tracker-tooltip").isVisible(),
            true,
          );
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.deepEqual(errors, []);
      } finally {
        areFontsReleased = true;
        for (const release of releases) release();
        await page.unrouteAll({ behavior: "wait" });
        await page.close();
      }
      console.log(
        `PASS: ${path} renders and navigates with ${mode} fonts${mode === "delayed" ? "; native remeasurement, focus and resize verified" : ""}`,
      );
    }
  }
} finally {
  await browser.close();
}

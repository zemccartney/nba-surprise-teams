// Focused built-site check, not a Lighthouse benchmark or visual approval.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const [base] = process.argv.slice(2);
if (!base) throw new Error("Usage: node font-loading.mjs <base-url>");
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const mode of ["normal", "delayed", "blocked"]) {
    for (const colorScheme of ["light", "dark"]) {
      for (const width of [390, 1440]) {
        for (const path of ["/stats/", "/2025/CHA/"]) {
          const page = await browser.newPage({
            colorScheme,
            viewport: { height: 1000, width },
          });
          const errors = [];
          const releases = [];
          let areFontsReleased = false;
          page.on("pageerror", (error) => {
            errors.push(error.message);
          });
          await page.route("**/*", async (route) => {
            const url = new URL(route.request().url());
            if (url.origin !== new URL(base).origin) return route.abort();
            if (/\.woff2?$/.test(url.pathname)) {
              if (mode === "blocked") return route.abort();
              if (mode === "delayed" && !areFontsReleased)
                await new Promise((resolve) => {
                  releases.push(resolve);
                });
            }
            return route.continue();
          });
          try {
            await page.goto(new URL(path, base).href, {
              waitUntil: "domcontentloaded",
            });
            const host = page.locator("[data-chart]").first();
            await host.scrollIntoViewIfNeeded();
            const svg = host.locator('svg[data-renderer="tanstack"]').first();
            await svg.waitFor();
            await svg.focus();
            await page.keyboard.press("Home");
            const tooltip = host.locator(".tracker-tooltip");
            await tooltip.waitFor({ state: "visible" });
            assert.ok(
              await tooltip.evaluate(
                (el) =>
                  Number.parseFloat(getComputedStyle(el).textUnderlineOffset) >=
                  2,
              ),
              "tooltip underlines have breathing room below the text",
            );
            const first = await tooltip.textContent();
            await page.keyboard.press("End");
            assert.notEqual(await tooltip.textContent(), first);
            assert.equal(
              await page.evaluate(() =>
                document.activeElement?.matches(
                  'svg[data-renderer="tanstack"]',
                ),
              ),
              true,
            );
            if (mode === "delayed") {
              assert.ok(
                releases.length > 0,
                "fonts were held while chart worked",
              );
              areFontsReleased = true;
              for (const release of releases) release();
            }
            await page.evaluate(() => document.fonts.ready);
            const result = await page.evaluate(() => ({
              fonts: performance
                .getEntriesByType("resource")
                .filter((r) => /\.woff2?(?:$|\?)/.test(r.name))
                .map((r) => ({ bytes: r.encodedBodySize, url: r.name })),
              loaded: [...document.fonts]
                .filter((f) => f.status === "loaded")
                .map((f) => ({ family: f.family, weight: f.weight })),
              overflow: document.documentElement.scrollWidth > innerWidth,
            }));
            if (mode !== "blocked") {
              const bytes = result.fonts.reduce((sum, f) => sum + f.bytes, 0);
              assert.ok(
                bytes > 0 && bytes < 60_000,
                `font payload: ${bytes} bytes`,
              );
              for (const weight of ["400", "700"])
                assert.ok(
                  result.loaded.some(
                    (f) =>
                      f.family.includes("Nanum Gothic Coding") &&
                      !f.family.includes("fallback:") &&
                      f.weight === weight,
                  ),
                  `real ${weight} face loaded`,
                );
            }
            assert.equal(
              await host.evaluate((el) => getComputedStyle(el).fontSynthesis),
              "none",
            );
            assert.equal(result.overflow, false, "no page overflow");
            assert.deepEqual(errors, []);
            // Escape dismisses a pinned dialog; an unpinned focus tooltip can remain.
            await page.keyboard.press("Enter");
            await host
              .locator('.tracker-tooltip[role="dialog"]')
              .waitFor({ state: "visible" });
            await page.keyboard.press("Escape");
            await tooltip.waitFor({ state: "hidden" });
            console.log(
              JSON.stringify({ colorScheme, mode, path, width, ...result }),
            );
          } finally {
            areFontsReleased = true;
            for (const release of releases) release();
            await page.close();
          }
        }
      }
    }
  }
} finally {
  await browser.close();
}

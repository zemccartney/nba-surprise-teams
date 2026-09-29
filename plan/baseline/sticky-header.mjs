import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { chromium, webkit } from "playwright-core";
import { PNG } from "pngjs";

const [base, output] = process.argv.slice(2);
if (!base || !output)
  throw new Error(
    "Usage: node sticky-header.mjs <base-url> <output-directory>",
  );
mkdirSync(output, { recursive: true });
const report = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch(
    engine === chromium ? { channel: "chrome" } : {},
  );
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({
        colorScheme: "light",
        deviceScaleFactor: width < 768 ? 3 : 1,
        hasTouch: width < 768,
        isMobile: width < 768,
        viewport: { height: 600, width },
      });
      const page = await context.newPage();
      for (const route of ["/2011/", "/2025/", "/2025/showdown/"]) {
        await page.goto(new URL(route, base).href, {
          waitUntil: "networkidle",
        });
        await page.evaluate(() => document.fonts.ready);
        const table = page.locator("table.stickyHeader").first();
        assert.equal(
          await table.evaluate((el) => getComputedStyle(el).borderCollapse),
          "separate",
        );
        for (const state of ["rest", "stuck"]) {
          await table.evaluate(
            (el, state) =>
              scrollTo(
                0,
                scrollY +
                  el.getBoundingClientRect().top +
                  (state === "rest"
                    ? -120
                    : el
                        .querySelector(":scope > tbody > tr")
                        .getBoundingClientRect().height / 2),
              ),
            state,
          );
          await page.waitForTimeout(100);
          const headers = await table
            .locator("thead > tr > :is(th,td)")
            .evaluateAll((cells) =>
              cells.map((cell) => ({
                ...cell.getBoundingClientRect().toJSON(),
                border: getComputedStyle(cell).borderBottomWidth,
                shadow: getComputedStyle(cell).boxShadow,
              })),
            );
          const image = PNG.sync.read(
            await page.screenshot({
              path: Path.join(
                output,
                `${engine.name()}-${width}-${route.replaceAll("/", "_")}-${state}.png`,
              ),
              scale: "css",
            }),
          );
          for (const header of headers) {
            assert.equal(header.shadow, "none");
            assert.equal(header.border, "2px");
            if (state === "stuck") assert.ok(Math.abs(header.y) < 1);
            // Sample inside cell padding, away from body text scrolling below it.
            const x = Math.floor(header.x + 6);
            const dark = [];
            for (
              let y = Math.floor(header.bottom) - 6;
              y <= Math.ceil(header.bottom) + 6;
              y++
            ) {
              const at = (y * image.width + x) * 4;
              if ([0, 1, 2].every((channel) => image.data[at + channel] < 70))
                dark.push(y);
            }
            assert.ok(
              dark.length > 0 && dark.length <= 3,
              `${engine.name()} ${width} ${route} ${state}: expected a single 2px edge, got rows ${dark}`,
            );
            assert.equal(
              dark.at(-1) - dark[0] + 1,
              dark.length,
              `${engine.name()} ${width} ${route} ${state}: no gap or second border line; rows ${dark}`,
            );
          }
          report.push({ engine: engine.name(), headers, route, state, width });
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(
  Path.join(output, "report.json"),
  JSON.stringify(report, undefined, 2),
);
console.log(
  `Passed ${report.length} Chromium/WebKit table-edge cases at rest and scrolled (mobile uses 3x DPR).`,
);

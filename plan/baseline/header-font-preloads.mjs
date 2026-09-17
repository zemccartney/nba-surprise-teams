import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    runs: { default: "5", type: "string" },
    width: { default: "1440", type: "string" },
  },
});
assert.ok(values.out, "Supply a new --out JSON path");
const browser = await chromium.launch({ channel: "chrome" });
const results = {
  browser: browser.version(),
  measurements: [],
  width: Number(values.width),
};
try {
  for (let run = 0; run < Number(values.runs); run++) {
    const ports = run % 2 ? [4332, 4331, 4333, 4330] : [4331, 4332, 4330, 4333];
    for (const port of ports) {
      const context = await browser.newContext({
        viewport: { height: 900, width: Number(values.width) },
      });
      await context.addInitScript(() => {
        // eslint-disable-next-line unicorn/no-global-object-property-assignment -- Retain page-local samples across the init-script/evaluate boundary.
        globalThis.headerSamples = [];
        const tick = () => {
          const title = document.querySelector(".site-title");
          const nav = document.querySelector(".nav-links");
          if (title && nav)
            globalThis.headerSamples.push({
              fonts: [...document.fonts]
                .filter((font) => /Sixtyfour|Chicago/.test(font.family))
                .map((font) => ({ family: font.family, status: font.status })),
              ms: performance.now(),
              navFont: getComputedStyle(nav).fontFamily,
              navWidth: nav.getBoundingClientRect().width,
              navX: nav.getBoundingClientRect().x,
              titleFont: getComputedStyle(title).fontFamily,
              titleWidth: title.getBoundingClientRect().width,
            });
          if (performance.now() < 2000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      for (const [visit, path] of [
        "/stats/",
        "/archive/",
        "/about/",
        "/stats/",
      ].entries()) {
        if (visit) {
          await Promise.all([
            page.waitForURL(`**${path}`),
            page.locator(`.nav-links a[href="${path}"]`).click(),
          ]);
        } else {
          await page.goto(`http://127.0.0.1:${port}${path}`);
        }
        await page.waitForTimeout(650);
        const data = await page.evaluate(() => ({
          fonts: performance
            .getEntriesByType("resource")
            .filter((entry) => /woff/.test(entry.name))
            .map((entry) => ({
              duration: entry.duration,
              name: entry.name,
              start: entry.startTime,
              transfer: entry.transferSize,
            })),
          paint: performance
            .getEntriesByType("paint")
            .map((entry) => ({ name: entry.name, start: entry.startTime })),
          preloads: [
            ...document.querySelectorAll('link[rel="preload"][as="font"]'),
          ].map((link) => link.href),
          samples: globalThis.headerSamples,
        }));
        assert.ok(data.samples.length);
        for (const name of [
          "sixtyfour-latin-full-normal",
          "ChicagoKare-Regular",
        ])
          assert.equal(
            data.fonts.filter((entry) => entry.name.includes(name)).length,
            1,
            `Duplicate or missing ${name} font resource`,
          );
        results.measurements.push({ path, port, run, visit, ...data });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(values.out, JSON.stringify(results, undefined, 2) + "\n", {
  flag: "wx",
});
console.log(
  `Saved ${results.measurements.length} navigations to ${values.out}`,
);

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
const [base, output] = process.argv.slice(2);
if (!base || !output)
  throw new Error(
    "Usage: node tanstack-feasibility.mjs <base-url> <report.json>",
  );
const browser = await chromium.launch({ channel: "chrome" });
const results = {};
try {
  const page = await browser.newPage({
    viewport: { height: 1000, width: 1200 },
  });
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
  });
  await page.goto(base);
  for (const kind of ["season", "team", "scatter", "pace"]) {
    const svg = page.locator(`#${kind} svg`).first();
    await svg.focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    const point = await page.evaluate((k) => globalThis.feasibility[k], kind);
    assert.ok(point?.original, kind);
    assert.ok(point.focus, kind);
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    if (kind === "season")
      assert.equal(await page.locator(`#${kind} [role="dialog"]`).count(), 1);
    await page.keyboard.press("Escape");
    if (kind === "season")
      assert.equal(
        await page.locator(`#${kind} [role="dialog"]`).isVisible(),
        false,
      );
    results[kind] = {
      ...point,
      ariaLabel: await svg.getAttribute("aria-label"),
      tabindex: await svg.getAttribute("tabindex"),
    };
  }
  const team = page.locator("#team svg").first();
  await team.focus();
  await page.keyboard.press("Home");
  const order = [];
  for (let i = 0; i < 65; i++) {
    order.push(
      await page.evaluate(() => globalThis.feasibility.team.focus?.teamId),
    );
    await page.keyboard.press("ArrowRight");
  }
  results.teamOrder = order;
  await page.locator("#season svg").first().focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  results.logos = await page
    .locator("#season img")
    .evaluateAll((xs) =>
      xs.map((x) => ({ alt: x.alt, loaded: x.naturalWidth > 0 })),
    );
  assert.ok(results.logos.length);
  assert.ok(results.logos.every((x) => x.alt && x.loaded));
  await page.setViewportSize({ height: 844, width: 390 });
  await page.waitForTimeout(200);
  results.mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(results.mobileOverflow, false);
  assert.deepEqual(errors, []);
  results.errors = errors;
  writeFileSync(output, JSON.stringify(results, undefined, 2) + "\n");
  console.log(results);
} finally {
  await browser.close();
}

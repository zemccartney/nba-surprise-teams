// Run against either dev or preview; no WAVE extension or production access required.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { chromium } from "playwright-core";

const tooltipImages = async (host, page) => {
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(40);
    const images = await host
      .locator("img.tooltip-logo")
      .evaluateAll((images) =>
        images.map((image) => ({
          alt: image.getAttribute("alt"),
          src: image.getAttribute("src"),
        })),
      );
    if (images.length > 0) return images;
    await page.keyboard.press("ArrowRight");
  }
  return [];
};

const [base, output] = process.argv.slice(2);
if (!base || !output)
  throw new Error(
    "Usage: node chart-image-labels.mjs <base-url> <report.json>",
  );
const browser = await chromium.launch({ channel: "chrome" });
const reports = [];
try {
  const page = await browser.newPage({
    viewport: { height: 1000, width: 1440 },
  });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  await page.goto(new URL("/stats/", base).href, { waitUntil: "networkidle" });
  for (const kind of [
    "surprises-per-season",
    "surprises-by-team",
    "team-season-scatter",
  ]) {
    const host = page.locator(`[data-chart="${kind}"]`);
    await host.scrollIntoViewIfNeeded();
    await host.focus();
    await page.waitForFunction(
      (kind) =>
        document
          .querySelector(`[data-chart="${CSS.escape(kind)}"]`)
          ?.getAttribute("role") === "slider",
      kind,
    );
    await page.keyboard.press("Home");
    if (kind === "surprises-by-team") {
      // Historical names need the alternative for the image actually shown.
      const index = await host.evaluate((host) =>
        JSON.parse(host.querySelector("script").textContent)
          .data.toSorted((a, b) => a.teamId.localeCompare(b.teamId))
          .findIndex((point) => point.history?.length),
      );
      assert.ok(index >= 0);
      for (let i = 0; i < index; i++) await page.keyboard.press("ArrowRight");
    }
    const images = await tooltipImages(host, page);
    assert.ok(images.length, kind);
    assert.ok(
      images.every(
        (image) => image.alt?.startsWith("Logo for ") && image.alt.length > 9,
      ),
    );
    reports.push({ images, kind });
    await page.keyboard.press("Escape");
  }
  await page.goto(new URL("/2025/CHA/", base).href, {
    waitUntil: "networkidle",
  });
  const pace = page.locator('[data-chart="team-season-pace"]');
  const target = await pace.evaluate(
    (host) =>
      JSON.parse(host.querySelector("script").textContent).winsToSurprise,
  );
  const label = `Surprise threshold: ${target} wins`;
  await pace.scrollIntoViewIfNeeded();
  await pace.focus();
  await page.waitForFunction(
    (label) =>
      document
        .querySelector('[data-chart="team-season-pace"] svg image')
        ?.getAttribute("aria-label") === label,
    label,
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ height: 1000, width });
    await page.waitForTimeout(250);
    const image = pace.locator("svg image");
    assert.equal(await image.getAttribute("role"), "img");
    assert.equal(await image.getAttribute("aria-label"), label);
    const description = await pace.getAttribute("aria-description");
    assert.ok(description.includes(label));
    assert.equal(await page.locator("img:not([alt])").count(), 0);
    reports.push({ kind: "pace-svg", label, width });
  }
  assert.deepEqual(errors, []);
  mkdirSync(Path.dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({ base, errors, reports }, undefined, 2) + "\n",
  );
  console.log(`Chart image alternatives passed: ${base}`);
} finally {
  await browser.close();
}

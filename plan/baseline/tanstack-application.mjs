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
  for (const width of [1440, 390, 320]) {
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
        const margins =
          kind === "team-season-pace"
            ? { bottom: 30, left: 84, right: 0, top: 0 }
            : {
                bottom: kind === "surprises-by-team" ? 56 : 76,
                left: 60,
                right: kind === "surprises-per-season" ? 16 : 8,
                top: kind === "surprises-per-season" ? 0 : 12,
              };
        const background = await svg
          .locator(':scope > rect[data-ts-key="tracker-plot-background"]')
          .evaluate((rect) => ({
            height: Number(rect.getAttribute("height")),
            width: Number(rect.getAttribute("width")),
            x: Number(rect.getAttribute("x")),
            y: Number(rect.getAttribute("y")),
          }));
        const box = await svg.evaluate((element) => ({
          height: element.viewBox.baseVal.height,
          width: element.viewBox.baseVal.width,
        }));
        assert.deepEqual(background, {
          height: box.height - margins.top - margins.bottom,
          width: box.width - margins.left - margins.right,
          x: margins.left,
          y: margins.top,
        });
        assert.equal(
          await svg.locator(':scope > rect[data-ts-key="background"]').count(),
          0,
        );
        // Enter through a real Tab, after lazy mounting has transferred the
        // chart's tab stop to the SVG. The outline must belong to its host so
        // Stats' deliberate overflow clipping cannot hide it.
        await host.evaluate((element) => {
          const before = document.createElement("button");
          before.dataset.chartFocusProbe = "";
          element.before(before);
          before.focus();
        });
        await page.keyboard.press("Tab");
        assert.equal(
          await svg.evaluate((element) => element === document.activeElement),
          true,
        );
        const outline = await host.evaluate((element) => ({
          color: getComputedStyle(element).outlineColor,
          style: getComputedStyle(element).outlineStyle,
          width: getComputedStyle(element).outlineWidth,
        }));
        assert.equal(outline.style, "solid");
        assert.equal(outline.width, "2px");
        await page
          .locator("[data-chart-focus-probe]")
          .evaluate((element) => element.remove());
        const appearance = await svg.evaluate((element) => ({
          dates: [
            ...element.querySelectorAll('[data-ts-key^="x-tick-label:"]'),
          ].map((label) => ({
            anchor: label.getAttribute("text-anchor"),
            text: label.textContent,
          })),
          grid: [
            ...element.querySelectorAll(":scope .ts-chart__grid line"),
          ].map((line) => ({
            opacity: getComputedStyle(line).strokeOpacity,
            stroke: getComputedStyle(line).stroke,
            x1: Number(line.getAttribute("x1")),
            x2: Number(line.getAttribute("x2")),
            y1: Number(line.getAttribute("y1")),
            y2: Number(line.getAttribute("y2")),
          })),
          labels: [
            ...element.querySelectorAll(':scope [data-ts-key="axes"] text'),
          ].map((label) => ({
            fill: getComputedStyle(label).fill,
            fillOpacity: getComputedStyle(label).fillOpacity,
            opacity: getComputedStyle(label).opacity,
          })),
          rules: [...element.querySelectorAll('line[stroke-width="4"]')].map(
            (line) => getComputedStyle(line).strokeOpacity,
          ),
        }));
        const labelBounds = await svg
          .locator('[data-ts-key^="x-tick-label:"]')
          .evaluateAll((labels) =>
            labels.map((label) => ({
              left: label.getBoundingClientRect().left,
              right: label.getBoundingClientRect().right,
            })),
          );
        const svgBounds = await svg.boundingBox();
        assert.ok(svgBounds);
        for (const label of labelBounds) {
          assert.ok(label.left >= svgBounds.x - 1);
          assert.ok(label.right <= svgBounds.x + svgBounds.width + 1);
        }
        assert.ok(appearance.labels.length > 0);
        for (const label of appearance.labels)
          assert.deepEqual(label, {
            fill: "rgb(124, 207, 0)",
            fillOpacity: "1",
            opacity: "1",
          });
        for (const line of appearance.grid) {
          const isVertical = line.x1 === line.x2;
          const position = isVertical ? line.x1 : line.y1;
          const min = isVertical ? background.x : background.y;
          const max = min + (isVertical ? background.width : background.height);
          assert.ok(position > min && position < max);
          assert.equal(position % 1, 0.5);
          assert.equal(line.stroke, "rgb(216, 249, 153)");
          assert.equal(line.opacity, "1");
        }
        for (const opacity of appearance.rules) assert.equal(opacity, "1");
        if (kind === "surprises-per-season") {
          assert.ok(
            appearance.dates.every(
              (date) => Number(date.text) % 5 === 0 && date.anchor === "middle",
            ),
          );
          assert.ok(appearance.dates.every((date) => date.text !== "1993"));
        } else if (kind === "team-season-pace") {
          assert.ok(appearance.dates.every((date) => date.anchor === "middle"));
          if (width === 1440) assert.equal(appearance.dates.length, 6);
        }
        await page.keyboard.press("Home");
        await page.waitForTimeout(50);
        const first = await host.locator(".tracker-tooltip").textContent();
        const point =
          kind === "team-season-scatter" || kind === "team-season-pace"
            ? await svg
                .locator(
                  kind === "team-season-scatter"
                    ? 'circle[r="6.3"]'
                    : 'circle[visibility="visible"]',
                )
                .first()
                .boundingBox()
            : undefined;
        if (point) {
          const tip = await host.locator(".tracker-tooltip").boundingBox();
          assert.ok(tip);
          const clearance = Math.max(
            tip.x - point.x - point.width,
            point.x - tip.x - tip.width,
            tip.y - point.y - point.height,
            point.y - tip.y - tip.height,
          );
          assert.ok(clearance >= 20, `${kind}: tooltip clearance ${clearance}`);
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
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
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await svg.blur();
        await page.mouse.move(0, 0);
        if (point) {
          await page.mouse.move(
            point.x + point.width / 2,
            point.y + point.height / 2,
          );
          await page.waitForTimeout(50);
          assert.equal(
            await host.locator(".tracker-tooltip").isVisible(),
            true,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          await page.mouse.move(0, 0);
        }
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
          appearance,
          first,
          kind,
          next,
          outline,
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

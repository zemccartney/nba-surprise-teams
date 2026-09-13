#!/usr/bin/env node
import Assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import Path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values: args } = parseArgs({
  options: { base: { type: "string" }, out: { type: "string" } },
});
if (!args.base) throw new Error("Pass --base <URL>");
if (args.out) await mkdir(args.out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  const page = await browser.newPage({
    reducedMotion: "reduce",
    viewport: { height: 900, width: 1920 },
  });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(String(error));
  });
  const response = await page.goto(`${args.base.replace(/\/$/, "")}/stats/`, {
    waitUntil: "networkidle",
  });
  Assert.equal(response.status(), 200);
  // Mount all lazy charts before narrowing; fresh-load screenshots miss this bug.
  const charts = await page.locator(".chart").all();
  for (const chart of charts) {
    await chart.scrollIntoViewIfNeeded();
    await chart.locator("svg").waitFor();
  }
  await page.evaluate(() => document.fonts.ready);
  const host = page.locator('[data-chart="surprises-per-season"]');
  const props = JSON.parse(
    await host.locator('script[type="application/json"]').textContent(),
  );
  const seasons = props.data.toSorted(
    (a, b) => Number(a.seasonId) - Number(b.seasonId),
  );
  for (const width of [
    1920, 1440, 1280, 1279, 1240, 1030, 1024, 768, 390, 1440,
  ]) {
    await page.setViewportSize({ height: 900, width });
    await host.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const geometry = await host.evaluate((el, count) => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const box = (node) => {
        const r = node.getBoundingClientRect();
        return {
          height: r.height,
          right: r.right,
          width: r.width,
          x: r.x,
          y: r.y,
        };
      };
      const shapes = [
        ...el.querySelectorAll(":scope svg path, :scope svg rect"),
      ].map((node) => ({
        ...box(node),
        dashed: node.hasAttribute("stroke-dasharray"),
        fill: node.getAttribute("fill"),
      }));
      const plot = shapes.find(
        (shape) => shape.fill === "#020618" && shape.height > 300,
      );
      return {
        bars: shapes
          .filter(
            (shape) =>
              shape.fill &&
              shape.fill !== "none" &&
              shape.width > 0 &&
              shape.width < (plot.width / count) * 0.95 &&
              shape.height >= 9,
          )
          .toSorted((a, b) => a.x - b.x),
        borderLines: shapes.filter(
          (shape) =>
            shape.dashed &&
            ((shape.width >= plot.width - 1 &&
              (Math.abs(shape.y - plot.y) < 1 ||
                Math.abs(shape.y - plot.y - plot.height) < 1)) ||
              (shape.height >= plot.height - 1 &&
                (Math.abs(shape.x - plot.x) < 1 ||
                  Math.abs(shape.x - plot.right) < 1))),
        ).length,
        charts: [...document.querySelectorAll(".stats-grid .chart")].map(
          (node) => box(node),
        ),
        overflow: document.documentElement.scrollWidth > innerWidth,
        plot,
        sections: [...document.querySelectorAll(".stats-grid > section")].map(
          (node) => box(node),
        ),
        table: box(document.querySelector("#top-10")),
      };
    }, seasons.length);
    Assert.ok(!geometry.overflow, `no page overflow at ${width}`);
    for (const rect of [
      ...geometry.sections,
      ...geometry.charts,
      geometry.table,
    ])
      Assert.ok(
        rect.x >= -1 && rect.right <= width + 1,
        `content fits at ${width}`,
      );
    if (width >= 1280) {
      for (const section of geometry.sections)
        Assert.ok(
          Math.abs(section.width - geometry.sections[0].width) < 1,
          `equal production columns at ${width}`,
        );
      Assert.ok(
        Math.abs(geometry.plot.y - geometry.table.y) < 1,
        "plot/table top alignment",
      );
    }
    Assert.equal(geometry.borderLines, 0, "no dotted plot border");
    Assert.equal(
      geometry.bars.length,
      seasons.length,
      "one bar per actual season",
    );
    const first = geometry.bars[0];
    const last = geometry.bars.at(-1);
    const gap = geometry.bars[1].x - first.right;
    Assert.ok(
      first.x - geometry.plot.x <= gap + 1,
      "no blank years before first season",
    );
    Assert.ok(
      geometry.plot.right - last.right <= gap + 1,
      "no extra band after last season",
    );
    for (const [bar, season] of [
      [first, seasons[0]],
      [last, seasons.at(-1)],
    ]) {
      await page.mouse.move(
        bar.x + bar.width / 2,
        geometry.plot.y + geometry.plot.height / 2,
      );
      await page.waitForFunction(
        (text) =>
          [...document.querySelectorAll(".tooltip-heading-centered")].some(
            (el) => el.checkVisibility() && el.textContent === text,
          ),
        `${season.seasonRange} Season`,
      );
    }
    await page.mouse.move(
      geometry.sections[0].x - 8,
      geometry.plot.y + geometry.plot.height / 2,
    );
    await page.waitForTimeout(400);
    // Tooltip dismissal/revalidation is a separate audit; these captures may
    // retain an endpoint tooltip. Containment must hold even with one present.
    results.push({ geometry, width });
    console.log(
      `PASS ${width}px: columns, containment, alignment, border, season bounds and endpoint tooltips`,
    );
    if (args.out && [390, 1440].includes(width))
      await page.screenshot({
        fullPage: true,
        path: Path.join(args.out, `stats-${width}.png`),
      });
  }
  Assert.deepEqual(errors, []);
  if (args.out)
    await writeFile(
      Path.join(args.out, "checks.json"),
      JSON.stringify({ base: args.base, results }, undefined, 2) + "\n",
    );
} finally {
  await browser.close();
}

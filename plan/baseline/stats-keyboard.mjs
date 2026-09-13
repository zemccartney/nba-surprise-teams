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
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { height: 900, width },
    });
    if (width === 390)
      await context.addInitScript(() => {
        Object.defineProperty(Element.prototype, "moveBefore", {
          configurable: true,
          value: undefined,
        });
      });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(String(error));
    });
    const response = await page.goto(`${args.base.replace(/\/$/, "")}/stats/`, {
      waitUntil: "networkidle",
    });
    Assert.equal(response.status(), 200);
    await page.evaluate(() => {
      const boundary = document.createElement("button");
      boundary.textContent = "End of page test control";
      boundary.style.cssText =
        "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0;pointer-events:none";
      document.body.append(boundary);
    });
    const kinds = [
      "surprises-per-season",
      "surprises-by-team",
      "team-season-scatter",
    ];
    const tableStops = await page
      .locator("#top-10 .popover-trigger, #top-10 a")
      .evaluateAll((nodes) =>
        nodes.map(
          (node) =>
            node.getAttribute("popovertarget") ?? node.getAttribute("href"),
        ),
      );
    const expectedOrder =
      width >= 1280
        ? [kinds[0], ...tableStops, ...kinds.slice(1)]
        : [...tableStops, ...kinds];
    const tabOrder = [];
    await page.locator("nav a").first().focus();
    for (let i = 0; i < 30 && tabOrder.at(-1) !== kinds.at(-1); i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active?.closest(".stats-grid")) return;
        return (
          active.dataset.chart ??
          active.getAttribute("popovertarget") ??
          active.getAttribute("href")
        );
      });
      if (stop) tabOrder.push(stop);
    }
    Assert.deepEqual(
      tabOrder,
      expectedOrder,
      "lazy chart discovery and responsive tab order",
    );
    for (const kind of kinds) {
      const host = page.locator(`[data-chart="${kind}"]`);
      const props = JSON.parse(
        await host.locator('script[type="application/json"]').textContent(),
      );
      const points = props.data.toSorted(
        kind === kinds[0]
          ? (a, b) => Number(a.seasonId) - Number(b.seasonId)
          : kind === kinds[1]
            ? (a, b) => a.teamId.localeCompare(b.teamId)
            : (a, b) =>
                a.overUnder - b.overUnder ||
                a.pace - b.pace ||
                a.teamName.localeCompare(b.teamName) ||
                a.seasonRange.localeCompare(b.seasonRange),
      );
      Assert.ok(points.length > 1);
      await host.focus();
      await page.locator(`[data-chart="${kind}"][role="slider"]`).waitFor();
      Assert.equal(await host.getAttribute("role"), "slider");
      Assert.equal(
        await host.getAttribute("aria-valuemax"),
        String(points.length),
      );
      Assert.equal(
        await host.evaluate((el) => getComputedStyle(el).outlineWidth),
        "2px",
      );
      const expectPoint = async (index) => {
        const point = points[index];
        const heading =
          kind === kinds[0]
            ? `${point.seasonRange} Season`
            : kind === kinds[1]
              ? point.name
              : `${point.seasonRange} ${point.teamName}`;
        Assert.equal(
          await host.getAttribute("aria-valuenow"),
          String(index + 1),
        );
        const description = await host.getAttribute("aria-valuetext");
        Assert.ok(
          description.includes(
            kind === kinds[1] ? point.name : point.seasonRange,
          ),
        );
        await page.waitForFunction(
          ({ heading, kind }) => {
            const text = document.querySelector(
              `[data-chart="${CSS.escape(kind)}"] .tooltip-heading-centered`,
            );
            return (
              text?.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }) && text.textContent.trim() === heading
            );
          },
          { heading, kind },
        );
        if (kind === "team-season-scatter") {
          // Tooltip HTML updates synchronously; SVG emphasis paints next frame.
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          );
          const feedback = await host.evaluate(
            (el, { data, point }) => {
              const shapes = [
                ...el.querySelectorAll(":scope svg path, :scope svg rect"),
              ];
              const plot = shapes
                .find(
                  (node) =>
                    node.getAttribute("fill") === "#020618" &&
                    node.getBoundingClientRect().height > 300,
                )
                .getBoundingClientRect();
              const active = shapes
                .filter(
                  (node) =>
                    Number(node.getAttribute("stroke-width")) > 0 &&
                    node.getAttribute("fill") !== "none",
                )
                .map((node) => {
                  const r = node.getBoundingClientRect();
                  const matrix = node.getScreenCTM();
                  return {
                    borderWidth:
                      Number(node.getAttribute("stroke-width")) *
                      Math.hypot(matrix.a, matrix.b),
                    stroke: node.getAttribute("stroke"),
                    width: r.width,
                    x: r.x + r.width / 2,
                    y: r.y + r.height / 2,
                  };
                });
              const xs = data.map((p) => p.overUnder);
              const ys = data.map((p) => p.pace);
              const minX = (Math.ceil(Math.min(...xs) / 5) - 1) * 5;
              const maxX = (Math.floor(Math.max(...xs) / 5) + 1) * 5;
              const minY = (Math.ceil(Math.min(...ys) / 5) - 1) * 5;
              const maxY = (Math.floor(Math.max(...ys) / 5) + 1) * 5;
              return {
                active,
                x:
                  plot.x +
                  ((point.overUnder - minX) / (maxX - minX)) * plot.width,
                y: plot.y + ((maxY - point.pace) / (maxY - minY)) * plot.height,
              };
            },
            { data: props.data, point },
          );
          Assert.equal(
            feedback.active.length,
            1,
            "exactly one keyboard-selected dot is outlined",
          );
          Assert.ok(
            Math.abs(feedback.active[0].borderWidth - 2) < 0.05,
            "outline is 2 CSS pixels after SVG scaling",
          );
          Assert.ok(
            feedback.active[0].width > 9,
            "active dot is slightly enlarged",
          );
          Assert.ok(
            Math.abs(feedback.active[0].x - feedback.x) < 1 &&
              Math.abs(feedback.active[0].y - feedback.y) < 1,
            `outline follows the selected point coordinates: ${JSON.stringify(feedback)}`,
          );
        }
      };
      await page.keyboard.press("Home");
      await expectPoint(0);
      await page.keyboard.press("ArrowLeft");
      await expectPoint(0);
      await page.keyboard.press("ArrowRight");
      await expectPoint(1);
      await page.keyboard.press("ArrowDown");
      await expectPoint(0);
      await page.keyboard.press("End");
      await expectPoint(points.length - 1);
      await page.keyboard.press("ArrowRight");
      await expectPoint(points.length - 1);
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowUp");
      await expectPoint(1);
      await page.keyboard.press("Escape");
      Assert.ok(await host.evaluate((el) => el === document.activeElement));
      await page.waitForFunction(
        (kind) =>
          !document
            .querySelector(
              `[data-chart="${CSS.escape(kind)}"] .tooltip-heading-centered`,
            )
            ?.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
        kind,
      );
      await page.keyboard.press("ArrowRight");
      await expectPoint(2);
      await page.keyboard.press("Tab");
      Assert.ok(await host.evaluate((el) => el !== document.activeElement));
      await page.keyboard.press("Shift+Tab");
      Assert.ok(await host.evaluate((el) => el === document.activeElement));
      await expectPoint(2);
      for (const nextWidth of [width === 390 ? 1440 : 390, width]) {
        await page.setViewportSize({ height: 900, width: nextWidth });
        await page.waitForFunction(
          (selector) =>
            document
              .querySelector(".stats-grid")
              .firstElementChild.matches(selector),
          nextWidth < 1280 ? ".section-top10" : ".section-surprises-season",
        );
        Assert.ok(
          await host.evaluate((el) => el === document.activeElement),
          "resize retains chart focus",
        );
        Assert.equal(await host.getAttribute("aria-valuenow"), "3");
      }
      await page.keyboard.press("Home");
      await expectPoint(0);
      if (args.out)
        await page.screenshot({
          fullPage: true,
          path: Path.join(args.out, `${kind}-${width}.png`),
        });
      results.push({ kind, points: points.length, width });
      console.log(
        `PASS ${kind} ${width}px: keyboard discovery, values/tooltips, bounds, focus and resize`,
      );
    }
    Assert.deepEqual(errors, []);
    await context.close();
  }
  if (args.out)
    await writeFile(
      Path.join(args.out, "checks.json"),
      JSON.stringify(results, undefined, 2) + "\n",
    );
} finally {
  await browser.close();
}

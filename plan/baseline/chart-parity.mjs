#!/usr/bin/env node
/* Targeted pace-chart/slot-style regression checks against dev or workerd preview.
   Usage: node plan/baseline/chart-parity.mjs --base http://localhost:4322 */
import Assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import Path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values: args } = parseArgs({
  options: {
    base: { type: "string" },
    out: { type: "string" },
  },
});
if (!args.base) {
  throw new Error("Pass --base <dev or preview URL>");
}
const base = args.base.replace(/\/$/, "");
const out = args.out;
if (out) await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  for (const path of ["/2025/CHA/", "/2011/CHA/", "/2024/TOR/"]) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        viewport: { height: 900, width },
      });
      if (width === 390) {
        // Also exercise older browsers' insert-and-restore fallback.
        await context.addInitScript(() => {
          Object.defineProperty(Element.prototype, "moveBefore", {
            configurable: true,
            value: undefined,
          });
        });
      }
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(String(error));
      });
      const response = await page.goto(base + path, {
        timeout: 20_000,
        waitUntil: "networkidle",
      });
      Assert.equal(response.status(), 200, path);
      // The chart is mobile's last control. A test-only boundary keeps the
      // forward/backward escape probe in the document, not browser chrome.
      await page.evaluate(() => {
        const boundary = document.createElement("button");
        boundary.type = "button";
        boundary.textContent = "End of page test control";
        boundary.style.cssText =
          "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0;pointer-events:none";
        document.body.append(boundary);
      });
      const host = page.locator('[data-chart="team-season-pace"]');
      // Test discovery before manually scrolling: a lazy offscreen chart must
      // not disappear from the tab order on the stacked mobile layout.
      const tableTriggers = await page
        .locator(".stats-grid .popover-trigger")
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("popovertarget")),
        );
      const tabOrder = [];
      await page.locator("nav a").first().focus();
      for (
        let i = 0;
        i < 12 && !(await host.evaluate((el) => el === document.activeElement));
        i++
      ) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const active = document.activeElement;
          if (!active?.closest(".stats-grid")) return;
          if (active.matches("[data-chart]")) return "chart";
          if (active.matches(".popover-trigger"))
            return active.getAttribute("popovertarget");
        });
        if (stop) tabOrder.push(stop);
      }
      Assert.ok(
        await host.evaluate((el) => el === document.activeElement),
        "Tab discovers lazy chart",
      );
      Assert.deepEqual(
        tabOrder,
        width < 1024 ? [...tableTriggers, "chart"] : ["chart"],
        "tab order follows reading order",
      );
      const slider = page.getByRole("slider", {
        name: "Selected game on the projected wins chart",
      });
      await slider.waitFor({ state: "visible" });
      await page.keyboard.press("Tab");
      await page.evaluate(() => document.fonts.ready);
      const props = JSON.parse(
        await host.locator('script[type="application/json"]').textContent(),
      );
      const geometry = await host.evaluate((el) => {
        // This helper must live in the serialized browser callback.
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const box = (node) => {
          const r = node.getBoundingClientRect();
          return { height: r.height, width: r.width, x: r.x, y: r.y };
        };
        const paths = [
          ...el.querySelectorAll(":scope svg path, :scope svg rect"),
        ].map((node) => ({
          fill: node.getAttribute("fill"),
          opacity: getComputedStyle(node).fillOpacity,
          rect: box(node),
          stroke: node.getAttribute("stroke"),
        }));
        const plot = paths.find(
          (p) => p.fill === "#020618" && p.rect.height > 300,
        );
        const lines = paths.filter((p) => p.stroke && p.stroke !== "none");
        return {
          area: paths.find((p) => p.fill?.startsWith("url(")),
          horizontalLines: lines.filter(
            (p) => p.rect.height < 1 && p.rect.width >= plot.rect.width - 1,
          ).length,
          labels: [...el.querySelectorAll(":scope svg text")].map(
            (node) => node.textContent,
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
          plot: plot.rect,
          stripes: [...document.querySelectorAll(".stats-table tbody tr")].map(
            (row) => getComputedStyle(row).backgroundColor,
          ),
          table: box(document.querySelector(".stats-table")),
          verticalLines: lines.filter(
            (p) => p.rect.width < 1 && p.rect.height >= plot.rect.height - 1,
          ).length,
        };
      });
      Assert.equal(geometry.area.opacity, "0.8", "area opacity");
      Assert.equal(geometry.horizontalLines, 1, "only threshold is horizontal");
      Assert.ok(geometry.verticalLines > 1, "vertical grid is present");
      Assert.deepEqual(
        new Set(
          geometry.labels.filter((label) => /^\d+$/.test(label)).map(Number),
        ),
        new Set([0, props.surpriseRules.numGames, props.winsToSurprise]),
        "only endpoints and surprise threshold are labelled",
      );
      Assert.ok(!geometry.overflow, "horizontal overflow");
      Assert.notEqual(geometry.stripes[0], "rgba(0, 0, 0, 0)");
      Assert.notEqual(geometry.stripes[0], geometry.stripes[1]);
      Assert.equal(geometry.stripes[0], geometry.stripes[2]);
      if (width === 1440)
        Assert.ok(
          Math.abs(geometry.plot.y - geometry.table.y) < 1,
          "plot/table top alignment",
        );

      // Resize an already-rendered chart: its previous SVG width must not
      // become the grid's intrinsic minimum and squeeze the table.
      if (width === 1440) {
        for (const intermediate of [1280, 1279, 1150, 1030, 1024, 1023, 1440]) {
          await page.setViewportSize({ height: 900, width: intermediate });
          await page.waitForTimeout(200);
          const layout = await host.evaluate((el) => {
            const grid = el.closest(".stats-grid");
            const table = grid.querySelector(".stats-table");
            const style = getComputedStyle(grid);
            const available =
              grid.getBoundingClientRect().width -
              Number.parseFloat(style.paddingLeft) -
              Number.parseFloat(style.paddingRight) -
              Number.parseFloat(style.columnGap);
            const record = document.createRange();
            record.selectNodeContents(table.querySelector(":scope tbody td"));
            return {
              available,
              chartWidth: el.getBoundingClientRect().width,
              overflow: document.documentElement.scrollWidth > innerWidth,
              recordLines: new Set(
                [...record.getClientRects()]
                  .filter((rect) => rect.width > 0)
                  .map((rect) => rect.y),
              ).size,
              tableRight: table.getBoundingClientRect().right,
              tableWidth: table.getBoundingClientRect().width,
            };
          });
          Assert.ok(
            !layout.overflow && layout.tableRight <= intermediate,
            `no overflow at ${intermediate}px`,
          );
          if (intermediate >= 1024) {
            Assert.ok(
              Math.abs(layout.tableWidth - layout.available * 0.4) < 1,
              `table retains production's 2/5 share at ${intermediate}px`,
            );
            Assert.ok(
              Math.abs(layout.chartWidth - layout.available * 0.6) < 1,
              `chart shrinks at ${intermediate}px`,
            );
            Assert.equal(
              layout.recordLines,
              1,
              `record stays on one line at ${intermediate}px`,
            );
          }
        }
      }

      // Reach the chart through Tab, not a synthetic keydown on a nonfocusable node.
      await page.locator("nav a").first().focus();
      for (
        let i = 0;
        i < 12 &&
        !(await slider.evaluate((el) => el === document.activeElement));
        i++
      )
        await page.keyboard.press("Tab");
      Assert.ok(
        await slider.evaluate((el) => el === document.activeElement),
        "Tab reaches chart",
      );
      const tooltip = page.locator(".tooltip-heading:visible");
      const expectPoint = async (index) => {
        Assert.equal(
          await slider.getAttribute("aria-valuenow"),
          String(index + 1),
        );
        const description = await slider.getAttribute("aria-valuetext");
        Assert.ok(description.includes(props.data[index].date));
        await page.waitForFunction(
          (date) =>
            [...document.querySelectorAll(".tooltip-heading")].some(
              (el) => el.checkVisibility() && el.textContent === date,
            ),
          props.data[index].date,
        );
      };
      await expectPoint(0);
      await page.keyboard.press("ArrowRight");
      await expectPoint(1);
      await page.keyboard.press("End");
      await expectPoint(props.data.length - 1);
      await page.keyboard.press("ArrowRight");
      await expectPoint(props.data.length - 1);
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowLeft");
      await expectPoint(0);
      await page.keyboard.press("Escape");
      await tooltip.waitFor({ state: "hidden" });
      Assert.ok(
        await slider.evaluate((el) => el === document.activeElement),
        "Escape retains chart focus",
      );
      await page.keyboard.press("ArrowRight");
      await expectPoint(1);
      // Cross the layout breakpoint while focused. DOM moves must preserve
      // the selector, its selection and the new forward/backward tab order.
      const oppositeWidth = width < 1024 ? 1440 : 390;
      await page.setViewportSize({ height: 900, width: oppositeWidth });
      await page.waitForFunction(
        (selector) =>
          document
            .querySelector(".stats-grid")
            .firstElementChild.matches(selector),
        oppositeWidth < 1024 ? ".stats-table" : "[data-chart]",
      );
      Assert.ok(
        await host.evaluate((el) => el === document.activeElement),
        "resize preserves focus",
      );
      Assert.equal(await host.getAttribute("role"), "slider");
      await page.keyboard.press(oppositeWidth < 1024 ? "Shift+Tab" : "Tab");
      Assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("popovertarget"),
        ),
        oppositeWidth < 1024 ? tableTriggers.at(-1) : tableTriggers[0],
        "resized tab order reaches the adjacent table trigger",
      );
      await page.keyboard.press(oppositeWidth < 1024 ? "Tab" : "Shift+Tab");
      Assert.ok(await host.evaluate((el) => el === document.activeElement));
      await page.setViewportSize({ height: 900, width });
      await page.waitForFunction(
        (selector) =>
          document
            .querySelector(".stats-grid")
            .firstElementChild.matches(selector),
        width < 1024 ? ".stats-table" : "[data-chart]",
      );
      Assert.ok(await host.evaluate((el) => el === document.activeElement));
      await expectPoint(1);
      if (out)
        await page.screenshot({
          fullPage: true,
          path: Path.join(
            out,
            `${path.replaceAll("/", "_")}-${width}-keyboard.png`,
          ),
        });
      await page.keyboard.press("Tab");
      Assert.ok(
        !(await slider.evaluate((el) => el === document.activeElement)),
        "Tab leaves chart",
      );
      await tooltip.waitFor({ state: "hidden" });
      await page.keyboard.press("Shift+Tab");
      Assert.ok(await slider.evaluate((el) => el === document.activeElement));
      await expectPoint(1);
      await page.keyboard.press("Shift+Tab");
      Assert.ok(
        !(await slider.evaluate((el) => el === document.activeElement)),
        "Shift+Tab leaves chart",
      );
      await tooltip.waitFor({ state: "hidden" });

      // Returning to the mouse after keyboard use must still select real data.
      await host.scrollIntoViewIfNeeded();
      const plotBox = await host
        .locator('svg path[fill="#020618"]')
        .boundingBox();
      const middle = Math.floor(props.data.length / 2);
      await page.mouse.move(
        plotBox.x + (middle / (props.data.length - 1)) * plotBox.width,
        plotBox.y + plotBox.height / 2,
      );
      await page.waitForFunction(
        (date) =>
          [...document.querySelectorAll(".tooltip-heading")].some(
            (el) => el.checkVisibility() && el.textContent === date,
          ),
        props.data[middle].date,
      );
      await page.mouse.move(5, 5);
      await tooltip.waitFor({ state: "hidden" });

      // An open table popover must survive moving its row group, too.
      const trigger = page.locator(".stats-grid .popover-trigger").first();
      await trigger.click();
      const popover = page.locator(".stats-table [popover]:popover-open");
      await popover.waitFor({ state: "visible" });
      await page.setViewportSize({ height: 900, width: oppositeWidth });
      await page.waitForTimeout(100);
      await popover.waitFor({ state: "visible" });
      await page.setViewportSize({ height: 900, width });
      await page.waitForTimeout(100);
      await popover.waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await popover.waitFor({ state: "hidden" });

      // Check SVG chart images, which the original img-only dev smoke missed.
      const symbolUrls = await host
        .locator("svg image")
        .evaluateAll((images) =>
          images.map(
            (image) =>
              image.getAttribute("href") || image.getAttribute("xlink:href"),
          ),
        );
      Assert.ok(symbolUrls.length > 0, "threshold emoji exists");
      for (const url of symbolUrls) {
        const image = await context.request.get(new URL(url, base).href);
        Assert.equal(image.status(), 200, "threshold emoji response");
      }
      Assert.deepEqual(errors, []);
      results.push({
        geometry,
        path,
        points: props.data.length,
        tabOrder,
        width,
      });
      console.log(
        `PASS ${path} ${width}px: layout, stripes, grid, labels, emoji and keyboard`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (out)
  await writeFile(
    Path.join(out, "checks.json"),
    JSON.stringify({ base, results }, undefined, 2) + "\n",
  );

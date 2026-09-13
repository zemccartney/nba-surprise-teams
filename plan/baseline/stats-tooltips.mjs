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
    const page = await browser.newPage({
      reducedMotion: "reduce",
      viewport: { height: 900, width },
    });
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => {
      errors.push(String(error));
    });
    page.on("request", (request) => {
      if (request.resourceType() === "image") requests.push(request.url());
    });
    await page.goto(`${args.base.replace(/\/$/, "")}/stats/`, {
      waitUntil: "networkidle",
    });
    const charts = await page.locator(".chart").all();
    for (const host of charts) {
      await host.scrollIntoViewIfNeeded();
      await host.locator("svg").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const kind = await host.getAttribute("data-chart");
      const geometry = await host.evaluate((el) => {
        const shapes = [
          ...el.querySelectorAll(":scope svg path, :scope svg rect"),
        ].map((node) => {
          const r = node.getBoundingClientRect();
          return {
            dashed: node.hasAttribute("stroke-dasharray"),
            fill: node.getAttribute("fill"),
            height: r.height,
            right: r.right,
            stroke: node.getAttribute("stroke"),
            width: r.width,
            x: r.x,
            y: r.y,
          };
        });
        const plot = shapes.find(
          (shape) => shape.fill === "#020618" && shape.height > 300,
        );
        const zero = [...el.querySelectorAll(":scope svg text")]
          .find((node) => node.textContent === "0")
          ?.getBoundingClientRect();
        return {
          borders: shapes.filter(
            (shape) =>
              shape.dashed &&
              ((shape.width >= plot.width - 1 &&
                (Math.abs(shape.y - plot.y) < 1 ||
                  Math.abs(shape.y - plot.y - plot.height) < 1)) ||
                (shape.height >= plot.height - 1 &&
                  (Math.abs(shape.x - plot.x) < 1 ||
                    Math.abs(shape.x - plot.right) < 1))),
          ).length,
          dottedZero:
            zero &&
            shapes.some(
              (shape) =>
                shape.dashed &&
                shape.width >= plot.width - 1 &&
                Math.abs(shape.y - zero.y - zero.height / 2) < 3,
            ),
          grayAxes: shapes.filter((shape) => shape.stroke === "#666").length,
          points: shapes.filter(
            (shape) =>
              shape.fill &&
              shape.fill !== "none" &&
              shape.width > 3 &&
              shape.width < 60 &&
              shape.height > 3 &&
              shape.height < 550,
          ),
          right: el.getBoundingClientRect().right,
          x: el.getBoundingClientRect().x,
        };
      });
      Assert.equal(geometry.borders, 0, `${kind}: no dotted boundary axes`);
      Assert.equal(geometry.grayAxes, 0, `${kind}: no plain gray axis overlay`);
      if (kind === "team-season-scatter")
        Assert.ok(geometry.dottedZero, "scatter zero line is dotted");
      if (width === 390) {
        Assert.equal(geometry.x, 8, "mobile chart has 8px left margin");
        Assert.equal(
          geometry.right,
          width - 8,
          "mobile chart has 8px right margin",
        );
      }
      // Choose a scatter point away from overlaps, or an ordinary bar interior.
      const point =
        kind === "team-season-scatter"
          ? geometry.points.find((candidate) =>
              geometry.points.every(
                (other) =>
                  other === candidate ||
                  Math.hypot(candidate.x - other.x, candidate.y - other.y) > 12,
              ),
            )
          : geometry.points.find((candidate) => candidate.height > 20);
      Assert.ok(point, `${kind}: hover target exists`);
      const x = point.x + point.width / 2;
      const y = point.y + point.height / 2;
      await page.mouse.move(x, y);
      await page.waitForTimeout(300);
      const probe = await host.evaluateHandle((el) => ({
        heading: el.querySelector(".tooltip-heading-centered"),
        images: [...el.querySelectorAll(".tooltip-logo")],
      }));
      Assert.ok(
        await probe.evaluate(({ images }) => images.length > 0),
        `${kind}: tooltip contains icons`,
      );
      await page.waitForFunction(
        ({ images }) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        probe,
      );
      await page.waitForTimeout(200);
      requests.length = 0;
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(
          x + (i % 2 ? 0.5 : -0.5),
          y + ((i % 3) - 1) * 0.5,
        );
        await page.waitForTimeout(20);
        Assert.ok(
          await host.evaluate((el, { heading, images }) => {
            return (
              el.querySelector(".tooltip-heading-centered") === heading &&
              heading.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }) &&
              images.every(
                (image, index) =>
                  image === el.querySelectorAll(".tooltip-logo")[index] &&
                  image.complete &&
                  image.naturalWidth > 0,
              )
            );
          }, probe),
          `${kind}: heading/icons stay visible, decoded and identical during motion`,
        );
      }
      Assert.deepEqual(
        requests,
        [],
        `${kind}: no image requests during same-point movement`,
      );
      if (kind === "team-season-scatter") {
        const active = await host.evaluate((el) =>
          [...el.querySelectorAll(":scope svg path[stroke]")]
            .filter(
              (node) =>
                Number(node.getAttribute("stroke-width")) > 0 &&
                node.getAttribute("fill") !== "none",
            )
            .map((node) => {
              const r = node.getBoundingClientRect();
              return {
                width: r.width,
                x: r.x + r.width / 2,
                y: r.y + r.height / 2,
              };
            }),
        );
        Assert.equal(active.length, 1, "one hovered dot is outlined");
        Assert.ok(
          active[0].width > 9 &&
            Math.abs(active[0].x - x) < 1 &&
            Math.abs(active[0].y - y) < 1,
          "hover outline encloses the mouse target",
        );
      }
      await probe.dispose();
      results.push({ imageRequests: requests.length, kind, moves: 20, width });
      console.log(
        `PASS ${kind} ${width}px: margins, boundary lines and stable tooltip DOM/images through 20 moves`,
      );
    }
    Assert.deepEqual(errors, []);
    await page.close();
  }
  if (args.out)
    await writeFile(
      Path.join(args.out, "checks.json"),
      JSON.stringify(results, undefined, 2) + "\n",
    );
} finally {
  await browser.close();
}

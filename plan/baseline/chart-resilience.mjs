import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values } = parseArgs({
  options: { base: { default: "http://localhost:4322", type: "string" } },
});
const browser = await chromium.launch({ channel: "chrome" });
const options = {
  reducedMotion: "reduce",
  viewport: { height: 900, width: 1440 },
};
try {
  for (const mode of ["blocked", "stalled"]) {
    const page = await browser.newPage(options);
    const errors = [];
    let requests = 0;
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    await page.route(
      (url) => /\.(woff2?|ttf|otf)$/.test(url.pathname),
      async (route) => {
        requests++;
        if (mode === "blocked") await route.abort();
        // Stalled requests deliberately remain paused until the page closes.
      },
    );
    for (const path of ["stats/", "2025/CHA/"]) {
      await page.goto(new URL(path, values.base).href, {
        waitUntil: "domcontentloaded",
      });
      const hosts = page.locator("[data-chart]");
      assert.equal(await hosts.count(), path === "stats/" ? 3 : 1);
      const charts = await hosts.all();
      for (const host of charts) {
        await host.focus();
        await page.waitForFunction(
          (element) =>
            element.getAttribute("role") === "slider" &&
            element.querySelector("svg"),
          await host.elementHandle(),
          { timeout: 6000 },
        );
        await page.keyboard.press("End");
        assert.ok(await host.getAttribute("aria-valuetext"));
      }
    }
    assert.ok(requests > 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${mode} fonts: all four charts render and support keyboard navigation`,
    );
  }

  const page = await browser.newPage({ ...options, hasTouch: true });
  await page.goto(new URL("stats/", values.base).href, {
    waitUntil: "networkidle",
  });
  await page.locator("nav a").first().focus();
  const host = page.locator('[data-chart="team-season-scatter"]');
  await host.scrollIntoViewIfNeeded();
  await host.locator("svg").waitFor();
  const { other, target } = await host.evaluate(async (element) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    const dots = [...element.querySelectorAll(":scope svg path")]
      .map((node) => node.getBoundingClientRect())
      .filter(
        (rect) =>
          rect.width > 8 &&
          rect.width < 10 &&
          rect.height > 8 &&
          rect.height < 10,
      )
      .toSorted((a, b) => a.y - b.y)
      .map((dot) => ({ x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 }));
    const target = dots[0];
    return {
      other: dots.find(
        (dot) => Math.hypot(dot.x - target.x, dot.y - target.y) > 30,
      ),
      target,
    };
  });
  assert.ok(other);
  const waitState = async (visible, outlines, point) => {
    await page.waitForFunction(
      ({ outlines, point, visible }) => {
        const element = document.querySelector(
          '[data-chart="team-season-scatter"]',
        );
        const tooltip = element.querySelector(".tooltip-heading-centered");
        const active = [
          ...element.querySelectorAll(":scope svg path[stroke]"),
        ].filter(
          (node) =>
            Number(node.getAttribute("stroke-width")) > 0 &&
            node.getAttribute("fill") !== "none",
        );
        return (
          Boolean(
            tooltip?.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
          ) === visible &&
          active.length === outlines &&
          (!point ||
            active.some((node) => {
              const rect = node.getBoundingClientRect();
              return (
                Math.abs(rect.x + rect.width / 2 - point.x) < 1 &&
                Math.abs(rect.y + rect.height / 2 - point.y) < 1
              );
            }))
        );
      },
      { outlines, point, visible },
    );
  };
  await page.mouse.move(target.x, target.y);
  await waitState(true, 1);
  await page.keyboard.press("Escape");
  await waitState(false, 1);
  await page.mouse.move(target.x + 0.2, target.y);
  await waitState(true, 1);
  await page.evaluate(() => {
    const popover = document.createElement("div");
    popover.id = "resilience-popover";
    popover.popover = "auto";
    document.body.append(popover);
    popover.showPopover();
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator("#resilience-popover")
      .evaluate((element) => element.matches(":popover-open")),
    false,
  );
  await waitState(true, 1);
  await page.mouse.click(target.x, target.y);
  await waitState(true, 1);
  assert.match(await host.getAttribute("aria-valuetext"), /Phoenix Suns/);
  const selected = Number(await host.getAttribute("aria-valuenow"));
  await page.keyboard.press("ArrowRight");
  await waitState(true, 1);
  assert.equal(Number(await host.getAttribute("aria-valuenow")), selected + 1);
  await page.mouse.move(target.x + 0.3, target.y);
  await waitState(true, 1, target);
  await page.mouse.move(other.x, other.y);
  await waitState(true, 1, other);
  await page.mouse.move(target.x, target.y);
  await waitState(true, 1, target);
  await page.mouse.move(0, 0);
  await waitState(false, 0);
  await page
    .locator("nav a")
    .first()
    .evaluate((element) => element.focus({ preventScroll: true }));
  await page.touchscreen.tap(target.x, target.y);
  await waitState(true, 1, target);
  assert.match(await host.getAttribute("aria-valuetext"), /Phoenix Suns/);
  assert.ok(
    await host.evaluate((element) => document.activeElement === element),
  );
  await page.keyboard.press("ArrowRight");
  await waitState(true, 1);
  assert.equal(Number(await host.getAttribute("aria-valuenow")), selected + 1);
  console.log(
    "Scatter: hover Escape, native popover precedence, click selection, keyboard/pointer handoff, point changes, leave and touch all pass",
  );
} finally {
  await browser.close();
}

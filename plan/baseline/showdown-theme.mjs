import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { chromium } from "playwright-core";

const [base, output] = process.argv.slice(2);
if (!base || !output)
  throw new Error(
    "Usage: node showdown-theme.mjs <base-url> <output-directory>",
  );
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const report = [];
try {
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({
        colorScheme: theme,
        reducedMotion: "reduce",
        viewport: { height: 1000, width },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });
      for (const path of [
        "/",
        "/2025/",
        "/1993/showdown/",
        "/2024/showdown/",
        "/2025/showdown/",
      ]) {
        await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
        await page.locator("#theme-toggle:not([hidden])").waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          theme,
        );
        assert.equal(await page.locator("#theme-toggle").count(), 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        const contrast = await page.evaluate(() => {
          const probe = document.createElement("span");
          document.body.append(probe);
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d");
          const luminance = (role) => {
            probe.style.color = `var(--${role})`;
            ctx.fillStyle = getComputedStyle(probe).color;
            ctx.fillRect(0, 0, 1, 1);
            const rgb = [...ctx.getImageData(0, 0, 1, 1).data]
              .slice(0, 3)
              .map((v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              });
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
          };
          const result = [];
          for (const ink of [
            "ink-showdown",
            "ink-showdown-hover",
            "ink-positive",
          ])
            for (const background of ["surface-page", "surface-row"]) {
              const a = luminance(ink),
                b = luminance(background);
              result.push({
                background,
                ink,
                ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
              });
            }
          probe.remove();
          return result;
        });
        if (theme === "light")
          for (const item of contrast)
            assert.ok(item.ratio >= 4.5, JSON.stringify(item));
        if (path.endsWith("/showdown/")) {
          assert.ok((await page.locator(".matchup").count()) > 0);
          const winner = await page
            .locator(".winner .score")
            .first()
            .evaluate((el) => getComputedStyle(el).color);
          const loser = await page
            .locator(".opponent:not(.winner) .score")
            .first()
            .evaluate((el) => getComputedStyle(el).color);
          assert.notEqual(
            winner,
            loser,
            "winning score retains its own semantic emphasis",
          );
          if (theme === "light")
            assert.ok(
              await page
                .locator("th,td")
                .evaluateAll((cells) =>
                  cells.every(
                    (cell) =>
                      getComputedStyle(cell).borderBottomWidth === "2px",
                  ),
                ),
            );
          await page.locator('[popovertarget="showdown-info"]').first().click();
          assert.equal(
            await page
              .locator("#showdown-info")
              .evaluate((el) => el.matches(":popover-open")),
            true,
          );
          const before = await page
            .locator("#showdown-info")
            .evaluate((el) => getComputedStyle(el).backgroundColor);
          await page.locator("#theme-toggle").dispatchEvent("click");
          assert.notEqual(
            await page
              .locator("#showdown-info")
              .evaluate((el) => getComputedStyle(el).backgroundColor),
            before,
          );
          await page.locator("#theme-toggle").dispatchEvent("click");
          await page.keyboard.press("Escape");
          await page.locator(".opponent").first().focus();
          assert.notEqual(
            await page
              .locator(".opponent")
              .first()
              .evaluate((el) => getComputedStyle(el).outlineStyle),
            "none",
          );
          await page.evaluate(() => scrollTo(0, 0));
          if (path === "/2025/showdown/") {
            await page.screenshot({
              path: Path.join(output, `${theme}-${width}-showdown.png`),
            });
            await page.locator(".slate h2").first().scrollIntoViewIfNeeded();
            await page.screenshot({
              path: Path.join(output, `${theme}-${width}-matchups.png`),
            });
          }
        }
        report.push({ contrast, path, theme, width });
      }
      await page.goto(new URL("/stats/#showdown-history", base).href, {
        waitUntil: "networkidle",
      });
      const host = page.locator('[data-chart="showdown-scatter"]');
      await host.scrollIntoViewIfNeeded();
      const svg = host.locator('svg[data-renderer="tanstack"]');
      await svg.waitFor();
      await svg.focus();
      await page.keyboard.press("Home");
      let text = await page.locator(".scatter-tooltip").textContent();
      for (let i = 0; i < 30 && !text.includes("Charlotte Hornets"); i++) {
        await page.keyboard.press("ArrowRight");
        text = await page.locator(".scatter-tooltip").textContent();
      }
      assert.match(
        await page.locator(".scatter-tooltip").textContent(),
        /Charlotte Bobcats/,
      );
      assert.equal(
        await page
          .locator(".scatter-tooltip .showdown-tooltip-history li")
          .count(),
        3,
      );
      const paints = () =>
        page.evaluate(() => {
          const svg = document.querySelector(
            '[data-chart="showdown-scatter"] svg',
          );
          const tip = document.querySelector(".scatter-tooltip");
          return {
            background: getComputedStyle(tip).backgroundColor,
            dot: getComputedStyle(svg.querySelector("circle")).fill,
            ink: getComputedStyle(tip).color,
          };
        });
      const before = await paints();
      const identity = {
        svg: await svg.elementHandle(),
        tip: await page.locator(".scatter-tooltip").elementHandle(),
      };
      await page.locator("#theme-toggle").dispatchEvent("click");
      const after = await paints();
      assert.notEqual(before.dot, after.dot);
      assert.notEqual(before.background, after.background);
      assert.notEqual(before.ink, after.ink);
      assert.ok(
        await page.evaluate(
          ({ svg, tip }) =>
            svg ===
              document.querySelector('[data-chart="showdown-scatter"] svg') &&
            tip === document.querySelector(".scatter-tooltip"),
          identity,
        ),
      );
      await page.locator("#theme-toggle").dispatchEvent("click");
      const bounds = await page.locator(".scatter-tooltip").boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      assert.equal(await page.locator("[data-showdown-labels]").count(), 0);
      await page.screenshot({
        path: Path.join(output, `${theme}-${width}-history.png`),
      });
      await page.keyboard.press("Escape");
      // Verify role identity, not only currently coincident colors.
      assert.equal(
        await host.locator("circle").first().getAttribute("fill"),
        "var(--chart-surprise-dot)",
      );
      const bars = page.locator('[data-chart="showdown-history"]');
      await bars.scrollIntoViewIfNeeded();
      await bars.locator("svg").waitFor();
      const fills = await bars
        .locator('rect[fill^="var(--chart-"]')
        .evaluateAll((nodes) => nodes.map((el) => el.getAttribute("fill")));
      assert.ok(
        fills.includes("var(--chart-season)") &&
          fills.includes("var(--chart-alternate)"),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      report.push({
        after,
        before,
        path: "/stats/#showdown-history",
        theme,
        width,
      });
      await context.close();
    }
  }
  writeFileSync(
    Path.join(output, "report.json"),
    JSON.stringify(report, undefined, 2),
  );
  console.log(
    `Passed ${report.length} Showdown page/theme/viewport cases, full tooltips, live repaint, focus and light text contrast.`,
  );
} finally {
  await browser.close();
}

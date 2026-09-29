import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";

const [base, output] = process.argv.slice(2);
if (!base || !output)
  throw new Error("Usage: node light-mode.mjs <base-url> <output-directory>");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const report = [];
const pages = [
  "/",
  "/2025/",
  "/2025/CHA/",
  "/2025/POR/",
  "/archive/",
  "/stats/",
  "/about/",
  "/2011/",
  "/404/",
];
const themeOf = (page) =>
  page.locator("html").evaluate((element) => element.dataset.theme);
const ready = async (page) => {
  await page.locator("#theme-toggle:not([hidden])").waitFor();
  await page.evaluate(() => document.fonts.ready);
};

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
      for (const path of pages) {
        await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
        await ready(page);
        await page.addStyleTag({
          content: "astro-dev-toolbar { display: none !important; }",
        });
        assert.equal(await themeOf(page), theme);
        if (theme === "light") {
          const borders = await page.locator("th, td").evaluateAll((cells) =>
            cells.every((cell) => {
              const style = getComputedStyle(cell);
              if (cell.closest("table").classList.contains("stickyHeader")) {
                return (
                  style.borderRightWidth === "2px" &&
                  style.borderBottomWidth === "2px" &&
                  style.borderLeftWidth === "0px" &&
                  style.borderTopWidth ===
                    (cell.closest("thead") ? "2px" : "0px")
                );
              }
              return [
                style.borderTopWidth,
                style.borderRightWidth,
                style.borderBottomWidth,
                style.borderLeftWidth,
              ].every((width) => width === "2px");
            }),
          );
          assert.ok(borders, "all light table cells have borders");
        }
        const detroitFilters = await page
          .locator('img[style*="--detroit-logo-filter"]')
          .evaluateAll((images) =>
            images.map((image) => getComputedStyle(image).filter),
          );
        for (const filter of detroitFilters)
          assert.equal(
            filter === "none",
            theme === "light",
            "Detroit halo only in dark mode",
          );
        const bulbColor = await page
          .locator("#theme-toggle .bulb-fill")
          .evaluate((element) => getComputedStyle(element).color);
        const emojiPaints = await page
          .locator("[data-result-emoji]")
          .evaluateAll((images) =>
            images.map((image) => ({
              eyes: [...image.querySelectorAll(".skull-eye")].map((eye) => ({
                fill: getComputedStyle(eye).fill,
                filter: getComputedStyle(eye).filter,
              })),
              filter: getComputedStyle(image).filter,
              label: image.getAttribute("aria-label"),
              name: image.dataset.resultEmoji,
              nose: image.querySelector(".skull-nose")
                ? getComputedStyle(image.querySelector(".skull-nose")).fill
                : undefined,
              role: image.getAttribute("role"),
            })),
          );
        for (const { eyes, filter, label, name, nose, role } of emojiPaints) {
          assert.equal(
            filter,
            "none",
            "No whole-emoji filter dims the yellow eyes",
          );
          if (name === "eliminated") {
            assert.equal(role, "img");
            assert.match(
              label,
              /Skull and crossbones emoji, indicating a team is eliminated/,
            );
            assert.equal(eyes.length, 2, "Only the two eye sockets glow");
            assert.equal(
              nose,
              theme === "light" ? "rgb(0, 0, 0)" : "rgb(41, 47, 51)",
            );
            for (const eye of eyes) {
              assert.equal(
                eye.fill,
                theme === "light" ? bulbColor : "rgb(41, 47, 51)",
              );
              assert.equal(eye.filter === "none", theme === "dark");
            }
          } else {
            assert.equal(eyes.length, 0);
          }
        }
        const hosts = await page.locator("[data-chart]").all();
        for (const host of hosts) {
          await host.scrollIntoViewIfNeeded();
          await host.locator('svg[data-renderer="tanstack"]').waitFor();
        }
        await page.evaluate(() => scrollTo(0, 0));
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(
          overflow,
          false,
          `${theme} ${width} ${path}: page overflow`,
        );
        // Ensure the added bulb does not overlap legacy negative-margin season navigation.
        const toggle = await page.locator("#theme-toggle").boundingBox();
        const about = await page
          .locator('header a[href="/about/"]')
          .boundingBox();
        assert.equal(await page.locator("nav #theme-toggle").count(), 1);
        assert.ok(
          toggle.x >= about.x + about.width,
          "Bulb sits beside the last navigation link",
        );
        assert.ok(
          Math.abs(toggle.y + toggle.height / 2 - about.y - about.height / 2) <
            1,
          "Bulb is vertically aligned with the navigation links",
        );
        assert.ok(
          toggle.width >= 44 && toggle.height >= 44,
          "Retain a comfortable hit target",
        );
        const seasonLinks = await page.locator(".season-button").all();
        for (const link of seasonLinks) {
          const box = await link.boundingBox();
          assert.ok(
            box.y >= toggle.y + toggle.height ||
              box.x + box.width <= toggle.x ||
              box.x >= toggle.x + toggle.width,
            `${path}: season navigation overlaps the theme toggle`,
          );
        }
        const name =
          path.replaceAll("/", "-").replaceAll(/^-|-$/g, "") || "home";
        await page.screenshot({
          fullPage: true,
          path: Path.join(output, `${theme}-${name}-${width}.png`),
        });
        if (path === "/2025/CHA/" || path === "/2011/") {
          const trigger = page.locator(".popover-trigger").first();
          await trigger.click();
          const popover = page.locator("[popover]:popover-open");
          await popover.waitFor();
          const bounds = await popover.boundingBox();
          assert.ok(
            bounds.x >= -1 && bounds.x + bounds.width <= width + 1,
            "popover fits viewport",
          );
          await page.screenshot({
            path: Path.join(output, `${theme}-${name}-popover-${width}.png`),
          });
          await page.keyboard.press("Escape");
          assert.equal(await popover.count(), 0);
        }
        if (path === "/2011/") {
          // Compact tables need a shorter viewport to allow enough scroll travel.
          await page.setViewportSize({ height: 600, width });
          await page
            .locator("#standings")
            .evaluate((table) =>
              scrollTo(0, scrollY + table.getBoundingClientRect().top + 100),
            );
          const headers = await page
            .locator("#standings > thead > tr > :is(th, td)")
            .evaluateAll((cells) =>
              cells.map((cell) => ({
                ...cell.getBoundingClientRect().toJSON(),
                border: getComputedStyle(cell).borderBottomWidth,
                shadow: getComputedStyle(cell).boxShadow,
              })),
            );
          const screenshot = await page.screenshot({
            path: Path.join(output, `${theme}-sticky-header-${width}.png`),
          });
          for (const header of headers) {
            assert.ok(
              Math.abs(header.y) <= 1,
              "Header sticks to the viewport top after scrolling",
            );
            if (theme === "light") {
              assert.equal(header.shadow, "none", "No duplicate shadow edge");
              assert.equal(
                header.border,
                "2px",
                "Sticky cell carries its own real bottom border",
              );
              const pixels = PNG.sync.read(screenshot);
              const x = Math.floor(header.x + header.width / 2);
              // Sample the actual scrolled bottom edge, not just CSS declarations.
              const hasEdge = [1, 2].some((offset) => {
                const y = Math.floor(header.y + header.height) - offset;
                const start = (y * pixels.width + x) * 4;
                return [2, 6, 23].every(
                  (value, channel) =>
                    Math.abs(pixels.data[start + channel] - value) <= 1,
                );
              });
              assert.ok(
                hasEdge,
                "Visible slate bottom border in the scrolled screenshot",
              );
            } else {
              assert.equal(header.shadow, "none");
            }
          }
          await page.locator("#standings .popover-trigger").click();
          await page.locator("[popover]:popover-open").waitFor();
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("[popover]:popover-open").count(), 0);
          await page.setViewportSize({ height: 1000, width });
        }
        report.push({ overflow, path, theme, width });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  }

  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto(new URL("/2025/CHA/", base).href, {
    waitUntil: "networkidle",
  });
  await ready(page);
  // Convert actual CSS paints to sRGB via the browser, not a second OKLCH implementation.
  const contrast = await page.evaluate(() => {
    const probe = document.createElement("span");
    document.body.append(probe);
    const ctx = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
    const rgb = (token) => {
      probe.style.color = `var(--${token})`;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = getComputedStyle(probe).color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    // eslint-disable-next-line unicorn/consistent-function-scoping -- Must live in the serialized browser callback.
    const luminance = (values) =>
      values
        .map((v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const pairs = [
      ...["surface-page", "surface-row"].flatMap((bg) =>
        [
          "ink-primary",
          "ink-heading",
          "ink-link",
          "ink-link-hover",
          "help-ink",
        ].map((fg) => [fg, bg, 4.5]),
      ),
      ["ink-notice", "surface-page", 4.5],
      ["ink-warning", "surface-page", 4.5],
      ["popover-ink", "popover-surface", 4.5],
      ["close-ink", "popover-surface", 4.5],
      ["button-hover-ink", "button-hover-surface", 4.5],
      ["chart-axis", "surface-page", 4.5],
      ...[
        "chart-positive",
        "chart-negative",
        "chart-season",
        "chart-positive-line",
        "chart-negative-line",
        "chart-surprise-dot",
      ].map((fg) => [fg, "chart-surface", 3]),
      // Exact requested gold accents and table-stripe season bars do not
      // meet 3:1 against the pale plot. Report these explicit exceptions.
      ...["chart-highlight", "chart-zero", "chart-alternate"].map((fg) => [
        fg,
        "chart-surface",
        undefined,
      ]),
    ];
    for (const accent of ["chart-highlight", "chart-zero"])
      if (String(rgb(accent)) !== String(rgb("color-yellow-400")))
        throw new Error(
          `${accent} must retain the requested dark-theme accent`,
        );
    for (const [bar, source] of [
      ["chart-season", "ink-link"],
      ["chart-alternate", "surface-row"],
    ])
      if (String(rgb(bar)) !== String(rgb(source)))
        throw new Error(`${bar} must match ${source}`);
    const results = pairs.map(([fg, bg, minimum]) => {
      const a = luminance(rgb(fg));
      const b = luminance(rgb(bg));
      return {
        bg,
        fg,
        minimum,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
    probe.remove();
    return results;
  });
  writeFileSync(
    Path.join(output, "contrast.json"),
    JSON.stringify(contrast, undefined, 2),
  );
  for (const { bg, fg, minimum, ratio } of contrast) {
    if (minimum === undefined) continue;
    assert.ok(
      ratio >= minimum,
      `${fg} on ${bg}: ${ratio.toFixed(2)} < ${minimum}`,
    );
  }

  // Toggle with an open chart tooltip: the existing SVG node must repaint, not remount.
  const host = page.locator('[data-chart="team-season-pace"]');
  await host.scrollIntoViewIfNeeded();
  const svg = host.locator('svg[data-renderer="tanstack"]');
  await svg.waitFor();
  await svg.focus();
  await page.keyboard.press("Home");
  const tooltip = host.locator(".tracker-tooltip:visible");
  await tooltip.waitFor();
  const tipText = await tooltip.textContent();
  const tipLight = await tooltip.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  const livePaint = await svg.evaluate((element) => {
    const plot = element.querySelector(
      '[data-ts-key="tracker-plot-background"]',
    );
    const before = getComputedStyle(plot).fill;
    document.querySelector("#theme-toggle").click();
    return {
      after: getComputedStyle(plot).fill,
      before,
      sameSvg:
        element ===
        document.querySelector('[data-chart="team-season-pace"] svg'),
    };
  });
  assert.equal(livePaint.sameSvg, true);
  assert.notEqual(livePaint.before, livePaint.after);
  assert.equal(await tooltip.textContent(), tipText);
  assert.notEqual(
    await tooltip.evaluate((el) => getComputedStyle(el).backgroundColor),
    tipLight,
  );
  await page.screenshot({
    path: Path.join(output, "live-toggle-open-tooltip.png"),
  });

  await page.reload();
  await ready(page);
  assert.equal(await themeOf(page), "dark", "explicit choice survives reload");
  const second = await context.newPage();
  await second.goto(new URL("/about/", base).href);
  await ready(second);
  await second.locator("#theme-toggle").focus();
  await second.keyboard.press("Space");
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  assert.equal(
    await second.locator("#theme-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await context.close();

  const denied = await browser.newContext({ colorScheme: "dark" });
  await denied.addInitScript(() => {
    // Deny the app's preference, not Astro dev-toolbar's unrelated storage.
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "theme") throw new Error("Storage denied");
      // eslint-disable-next-line unicorn/no-this-outside-of-class -- Preserve the intercepted Storage receiver.
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "theme") throw new Error("Storage denied");
      // eslint-disable-next-line unicorn/no-this-outside-of-class -- Preserve the intercepted Storage receiver.
      return set.call(this, key, value);
    };
  });
  const blocked = await denied.newPage();
  const blockedErrors = [];
  blocked.on("pageerror", (error) => {
    blockedErrors.push(error.message);
  });
  await blocked.goto(base);
  await ready(blocked);
  await blocked.locator("#theme-toggle").click();
  assert.equal(await themeOf(blocked), "light");
  assert.deepEqual(blockedErrors, []);
  await denied.close();

  writeFileSync(
    Path.join(output, "checks.json"),
    JSON.stringify(
      { crossTab: true, livePaint, pages: report, storageDenied: true },
      undefined,
      2,
    ),
  );
  console.log(
    `Passed ${report.length} page/theme/viewport checks, contrast, live chart repaint, persistence, keyboard, cross-tab and denied storage.`,
  );
} finally {
  await browser.close();
}

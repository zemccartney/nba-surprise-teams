import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Path from "node:path";
import { chromium, firefox, webkit } from "playwright-core";

const [base, output, engine = "chromium", runtime = "preview"] =
  process.argv.slice(2);
if (!base || !output || !["dev", "preview"].includes(runtime))
  throw new Error(
    "Usage: node light-mode-preferences.mjs <base-url> <output-directory> [chromium|firefox|webkit] [dev|preview]",
  );
const browserType = { chromium, firefox, webkit }[engine];
assert.ok(browserType, "Unknown browser engine");
mkdirSync(output, { recursive: true });
const browser = await browserType.launch(
  engine === "chromium" ? { channel: "chrome" } : {},
);
const cases = [];
const result = { isPassed: false };
const contexts = [];
const errors = [];
const origin = new URL(base).origin;
const url = (path) => new URL(path, base).href;
const opposite = (theme) => (theme === "dark" ? "light" : "dark");
const createContext = async (colorScheme, saved, options = {}) => {
  const context = await browser.newContext({
    colorScheme,
    storageState:
      options.javaScriptEnabled === false
        ? undefined
        : {
            cookies: [],
            origins: [
              {
                localStorage:
                  saved === undefined ? [] : [{ name: "theme", value: saved }],
                origin,
              },
            ],
          },
    viewport: { height: 900, width: 1280 },
    ...options,
  });
  contexts.push(context);
  // Third-party podcast internals are outside this app's theme/accessibility
  // contract; omit the embed rather than hiding its intermittent telemetry errors.
  await context.route("https://embed.podcasts.apple.com/**", (route) =>
    route.fulfill({
      body: "<!doctype html><title>Podcast embed omitted for theme checks</title>",
      contentType: "text/html",
    }),
  );
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(20_000);
  console.log(
    `${engine}/${runtime}: context ${contexts.length}, completed ${cases.length} cases; system=${colorScheme}, saved=${JSON.stringify(saved)}`,
  );
  context.on("page", (page) => {
    page.on("pageerror", (error) => {
      errors.push({ message: error.message, url: page.url() });
    });
  });
  return context;
};
const ready = (page) => page.locator("#theme-toggle:not([hidden])").waitFor();
const settle = async (page) => {
  await page.bringToFront();
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
};
const assertTheme = async (page, theme) => {
  await page.bringToFront();
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    theme,
    { polling: 50 },
  );
  await ready(page);
  const button = page.getByRole("button", {
    exact: true,
    name: "Light mode",
    pressed: theme === "light",
  });
  assert.equal(await button.count(), 1);
  assert.equal(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).colorScheme),
    theme,
  );
};

try {
  // Real pages, including the inline head bootstrap, rather than a second
  // implementation of preference resolution in a test-only helper.
  for (const system of ["dark", "light"]) {
    for (const saved of [
      undefined,
      "dark",
      "light",
      "",
      "auto",
      "LIGHT",
      "null",
    ]) {
      const context = await createContext(system, saved);
      const page = await context.newPage();
      await page.goto(url("/about/"));
      const isExplicit = saved === "dark" || saved === "light";
      const expected = isExplicit ? saved : system;
      await assertTheme(page, expected);
      await page.emulateMedia({ colorScheme: opposite(system) });
      await settle(page);
      await assertTheme(page, isExplicit ? saved : opposite(system));
      cases.push({
        check: "initial + system change",
        saved: saved ?? "(unset)",
        system,
      });
      await context.close();
    }
  }
  {
    const context = await createContext("no-preference");
    const page = await context.newPage();
    await page.goto(url("/about/"));
    await assertTheme(page, "light");
    cases.push({ check: "no system preference defaults to light" });
    await context.close();
  }

  {
    const context = await createContext("dark");
    await context.addInitScript(() => {
      Object.defineProperty(globalThis, "__themePageShows", { value: [] });
      addEventListener("pageshow", (event) => {
        globalThis.__themePageShows.push(event.persisted);
      });
    });
    const page = await context.newPage();
    await page.goto(url("/"));
    await assertTheme(page, "dark");
    await page.locator('nav a[href="/about/"]').focus();
    // WebKit follows macOS's default reduced tab-navigation preference.
    // Option+Tab traverses all controls, as enabling full keyboard navigation does.
    await page.keyboard.press(engine === "webkit" ? "Alt+Tab" : "Tab");
    assert.equal(
      await page
        .locator("#theme-toggle")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    const focus = await page.locator("#theme-toggle").evaluate((el) => ({
      style: getComputedStyle(el).outlineStyle,
      width: getComputedStyle(el).outlineWidth,
    }));
    assert.deepEqual(focus, { style: "solid", width: "2px" });
    await page.keyboard.press("Space");
    await assertTheme(page, "light");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("theme")),
      "light",
    );
    assert.equal(
      await page
        .locator("#theme-toggle")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.reload();
    await assertTheme(page, "light");
    await page.locator('nav a[href="/archive/"]').click();
    await assertTheme(page, "light");
    await page.locator("#theme-toggle").focus();
    await page.keyboard.press("Enter");
    await assertTheme(page, "dark");
    await page.goBack();
    await assertTheme(page, "dark");
    const backCache = await page.evaluate(() => globalThis.__themePageShows);
    await page.goForward();
    await assertTheme(page, "dark");
    cases.push({
      backCache,
      check: "keyboard, visible focus, reload, navigation, back/forward",
    });
    await context.close();
  }

  {
    const context = await createContext("light", "dark");
    const page = await context.newPage();
    await page.goto(url("/about/"));
    await assertTheme(page, "dark");
    // Session storage in a same-origin iframe used to incorrectly change the
    // parent's theme. Wait for the actual event so an early assertion cannot pass.
    await page.evaluate(() => {
      Object.defineProperty(globalThis, "__themeSessionEvents", {
        value: { count: 0 },
      });
      addEventListener("storage", (event) => {
        if (event.storageArea === sessionStorage)
          globalThis.__themeSessionEvents.count++;
      });
    });
    const frameReady = page.waitForEvent("framenavigated", (frame) =>
      frame.url().includes("storage-probe"),
    );
    await page.evaluate(() => {
      const frame = document.createElement("iframe");
      frame.src = "/about/?storage-probe";
      frame.hidden = true;
      document.body.append(frame);
    });
    const frame = await frameReady;
    await frame
      .locator("#theme-toggle:not([hidden])")
      .waitFor({ state: "attached" });
    await frame.evaluate(() => sessionStorage.setItem("theme", "light"));
    await page.waitForFunction(() => globalThis.__themeSessionEvents.count > 0);
    await assertTheme(page, "dark");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("theme")),
      "dark",
    );
    await frame.evaluate(() => localStorage.setItem("theme", "light"));
    await assertTheme(page, "light");

    const other = await context.newPage();
    await other.goto(url("/about/"));
    await ready(other);
    await other.evaluate(() => localStorage.setItem("theme", "dark"));
    await assertTheme(page, "dark");
    await other.evaluate(() => localStorage.setItem("unrelated", "light"));
    await settle(page);
    await assertTheme(page, "dark");
    await other.evaluate(() => localStorage.removeItem("theme"));
    await assertTheme(page, "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await settle(page);
    await assertTheme(page, "dark");
    await other.evaluate(() => localStorage.setItem("theme", "invalid"));
    await assertTheme(page, "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await settle(page);
    await assertTheme(page, "light");
    await other.evaluate(() => localStorage.setItem("theme", "dark"));
    await assertTheme(page, "dark");
    await other.evaluate(() => localStorage.clear());
    await assertTheme(page, "light");
    cases.push({
      check:
        "local/session event isolation, cross-tab set/remove/clear/invalid, unrelated key",
    });
    await context.close();
  }

  // Deny theme reads/writes in dev without breaking Astro's unrelated toolbar.
  // Built preview additionally exercises denial of the entire storage getter.
  const denials =
    runtime === "preview" ? ["read", "write", "getter"] : ["read", "write"];
  for (const system of ["dark", "light"]) {
    for (const denial of denials) {
      const context = await createContext(system);
      await context.addInitScript((mode) => {
        if (mode === "getter") {
          Object.defineProperty(globalThis, "localStorage", {
            get() {
              throw new DOMException("Storage denied", "SecurityError");
            },
          });
        } else {
          const method = mode === "read" ? "getItem" : "setItem";
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (...args) {
            if (args[0] === "theme")
              throw new DOMException("Storage denied", "SecurityError");
            // eslint-disable-next-line unicorn/no-this-outside-of-class -- Preserve the intercepted Storage receiver.
            return original.apply(this, args);
          };
        }
      }, denial);
      const page = await context.newPage();
      await page.goto(url("/about/"));
      await assertTheme(page, system);
      await page.locator("#theme-toggle").click();
      await assertTheme(page, opposite(system));
      await page.emulateMedia({ colorScheme: opposite(system) });
      await page.emulateMedia({ colorScheme: system });
      await settle(page);
      await assertTheme(page, opposite(system));
      await page.reload();
      await assertTheme(page, system);
      cases.push({
        check: "denied storage keeps an in-memory choice until navigation",
        denial,
        system,
      });
      await context.close();
    }
  }

  for (const system of ["dark", "light"]) {
    const context = await createContext(system, "light", {
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    // Firefox's storageState initialization hangs with JavaScript disabled.
    // Seed through automation on the origin instead; app scripts remain disabled.
    await page.goto(url("/about/"));
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.goto(url("/2011/"));
    assert.equal(
      await page.locator("html").evaluate((el) => el.dataset.theme),
      undefined,
    );
    assert.equal(
      await page
        .locator("html")
        .evaluate((el) => getComputedStyle(el).colorScheme),
      "dark",
    );
    assert.equal(await page.locator("#theme-toggle").isHidden(), true);
    assert.equal(await page.locator("#standings").isVisible(), true);
    await page.locator("#standings .popover-trigger").click();
    assert.equal(await page.locator("[popover]:popover-open").count(), 1);
    await page.keyboard.press("Escape");
    await page.screenshot({
      fullPage: true,
      path: Path.join(output, `no-js-${system}.png`),
    });
    await page.locator('nav a[href="/about/"]').click();
    assert.equal(new URL(page.url()).pathname, "/about/");
    cases.push({
      check:
        "no JavaScript: dark fallback, hidden toggle, native links/popovers",
      system,
    });
    await context.close();
  }

  for (const system of ["dark", "light"]) {
    for (const saved of [undefined, opposite(system), "invalid"]) {
      const expected =
        saved === undefined || saved === "invalid" ? system : saved;
      const context = await createContext(system, saved);
      await context.addInitScript(() => {
        Object.defineProperty(globalThis, "__themePaintProbe", {
          value: { frames: [], paints: [], stop: false },
        });
        const sample = () => {
          if (document.body && document.body.textContent.trim()) {
            globalThis.__themePaintProbe.frames.push({
              background: getComputedStyle(document.body).backgroundColor,
              theme: document.documentElement.dataset.theme,
              time: performance.now(),
            });
          }
          if (!globalThis.__themePaintProbe.stop) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        if (PerformanceObserver.supportedEntryTypes.includes("paint")) {
          new PerformanceObserver((list) => {
            globalThis.__themePaintProbe.paints.push(
              ...list
                .getEntries()
                .map((entry) => ({ name: entry.name, time: entry.startTime })),
            );
          }).observe({ buffered: true, type: "paint" });
        }
      });
      // The inline head initializer must work without the toggle module. Astro
      // inlines small modules in production, so withhold those as well as external
      // scripts. Keep the classic inline head initializer. Delay CSS for a cold load.
      await context.route("**/*", async (route) => {
        const type = route.request().resourceType();
        if (
          type === "document" &&
          new URL(route.request().url()).origin !== origin
        )
          return route.fallback();
        if (type === "document") {
          const response = await route.fetch();
          const html = await response.text();
          return route.fulfill({
            body: html.replaceAll(
              /<script\b[^>]*\btype=(?:"module"|'module')[^>]*>[\s\S]*?<\/script>/g,
              "",
            ),
            response,
          });
        }
        if (type === "script") return route.abort();
        if (type === "stylesheet")
          await new Promise((resolve) => setTimeout(resolve, 250));
        return route.continue();
      });
      const page = await context.newPage();
      await page.goto(url("/about/"), { waitUntil: "networkidle" });
      await page.waitForFunction(
        () => globalThis.__themePaintProbe.frames.length >= 3,
      );
      const paint = await page.evaluate(() => {
        globalThis.__themePaintProbe.stop = true;
        return {
          frames: globalThis.__themePaintProbe.frames,
          paints: globalThis.__themePaintProbe.paints,
        };
      });
      assert.ok(
        paint.frames.every((frame) => frame.theme === expected),
        "No wrong-theme body frame before the toggle bundle",
      );
      assert.equal(await page.locator("#theme-toggle").isHidden(), true);
      const finalBackground = await page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      const paintedFrames = paint.frames.filter(
        (frame) => frame.background !== "rgba(0, 0, 0, 0)",
      );
      assert.ok(paintedFrames.length > 0);
      assert.ok(
        paintedFrames.every((frame) => frame.background === finalBackground),
      );
      await page.screenshot({
        path: Path.join(
          output,
          `first-paint-os-${system}-saved-${saved ?? "unset"}.png`,
        ),
      });
      cases.push({
        check:
          "first paint with unset/opposite/invalid preference, delayed CSS and withheld module scripts",
        expected,
        paint,
        saved: saved ?? "(unset)",
        system,
      });
      await context.close();
    }
  }

  assert.deepEqual(errors, []);
  result.isPassed = true;
  console.log(
    `${engine} ${runtime}: ${cases.length} preference/accessibility/paint cases passed.`,
  );
} finally {
  writeFileSync(
    Path.join(output, "checks.json"),
    JSON.stringify(
      {
        browser: engine,
        cases,
        errors,
        isPassed: result.isPassed,
        runtime,
        version: browser.version(),
      },
      undefined,
      2,
    ),
  );
  for (const context of contexts) await context.close();
  await browser.close();
}

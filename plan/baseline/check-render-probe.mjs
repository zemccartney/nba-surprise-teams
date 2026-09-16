import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseline = process.argv[2] ?? "http://127.0.0.1:4322";
const probe = process.argv[3] ?? "http://127.0.0.1:4324";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    reducedMotion: "reduce",
    viewport: { height: 900, width: 1440 },
  });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  const islandResponses = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith("/_server-islands/")) {
      islandResponses.push(response);
    }
  });
  const payload = () =>
    page.locator('[data-chart] script[type="application/json"]').textContent();
  await page.goto(new URL("/2025/CHA/", baseline).href);
  const reference = JSON.parse(await payload());
  assert.equal(reference.data.length, 82);
  for (let visit = 0; visit < 2; visit++) {
    if (visit === 0) await page.goto(new URL("/render-probe/", probe).href);
    else await page.reload();
    const chart = page.locator('[data-chart][role="slider"]');
    await chart.waitFor();
    assert.deepEqual(JSON.parse(await payload()), reference);
    assert.equal(await page.locator("[data-probe-loading]").count(), 0);
    await chart.focus();
    await page.keyboard.press("End");
    assert.equal(
      await chart.getAttribute("aria-valuenow"),
      await chart.getAttribute("aria-valuemax"),
    );
    assert.ok(await chart.getAttribute("aria-valuetext"));
    const response = islandResponses.at(-1);
    assert.equal(response.status(), 200);
    const headers = await response.allHeaders();
    assert.match(headers["cache-control"], /no-store/);
  }
  assert.equal(
    islandResponses.length,
    2,
    "Each navigation must request the island anew",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Both island visits match the archived chart payload, mount, support End-key selection and bypass response caching.",
  );
} finally {
  await browser.close();
}

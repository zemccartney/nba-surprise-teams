#!/usr/bin/env node
/*
  Dev-server smoke check. The build comparison in capture.mjs runs against
  built output, so it says nothing about `astro dev`. Adapter 14 moved dev into
  workerd, where the two environments no longer share an image endpoint, and a
  config that builds perfectly can still serve nothing in dev. This is the
  cheap check that would have caught that: load each page in a real browser,
  scroll to trigger lazy loading, and report images that never decoded plus any
  console error or failed request.

  usage: node plan/baseline/dev-smoke.mjs --base http://localhost:4321
*/
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const PAGES = [
  "/",
  "/archive/",
  "/stats/",
  "/about/",
  "/2024/",
  "/2024/TOR/",
  "/2011/CHA/",
];

const { values: args } = parseArgs({
  options: {
    base: { default: "http://localhost:4321", type: "string" },
    chrome: { type: "string" },
  },
});

const browser = await chromium.launch(
  args.chrome || process.env.CHROME_PATH
    ? { executablePath: args.chrome || process.env.CHROME_PATH }
    : { channel: "chrome" },
);
const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });

const problems = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    problems.push(`console: ${message.text().slice(0, 120)}`);
  }
});
page.on("requestfailed", (request) => {
  problems.push(`requestfailed: ${request.url().slice(0, 120)}`);
});
page.on("response", (response) => {
  if (response.status() >= 400) {
    problems.push(`${response.status()}: ${response.url().slice(0, 120)}`);
  }
});

let totalImages = 0;
let brokenImages = 0;
for (const path of PAGES) {
  await page.goto(args.base + path, { waitUntil: "networkidle" });
  // Lazy images below the fold never request until they scroll into view.
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  const result = await page.evaluate(() => {
    const images = [...document.querySelectorAll("img")];
    return {
      broken: images.filter((image) => image.naturalWidth === 0).length,
      total: images.length,
    };
  });
  totalImages += result.total;
  brokenImages += result.broken;
  console.log(
    `${path.padEnd(13)} images ${String(result.total).padStart(3)}  not rendering ${result.broken}`,
  );
}
await browser.close();

console.log(`\nimages: ${totalImages} checked, ${brokenImages} not rendering`);
console.log(`problems: ${problems.length}`);
for (const problem of problems.slice(0, 20)) {
  console.log(`  ${problem}`);
}

if (brokenImages > 0 || problems.length > 0) {
  process.exitCode = 1;
}

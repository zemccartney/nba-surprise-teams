import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const [base] = process.argv.slice(2);
if (!base)
  throw new Error("Usage: node tanstack-tooltip-safety.mjs <base-url>");
const name = 'Team "quoted" & <historic>';
const logoSrc =
  '/logo".svg?alt=" onerror="document.documentElement.dataset.chartInjection=1';
const team = {
  logoSrc,
  name,
  numEliminated: 2,
  numSurprised: 1,
  teamId: "CHA",
};
const cases = [
  {
    kind: "surprises-per-season",
    payload: {
      data: [
        {
          numSurprises: 1,
          seasonId: "2025",
          seasonRange: "2025–26",
          surpriseTeams: [team],
        },
      ],
      latestSeasonYear: 2025,
    },
  },
  { kind: "surprises-by-team", payload: { data: [team] } },
  {
    kind: "surprises-by-team",
    payload: {
      data: [
        {
          ...team,
          history: [{ duration: [1995, 2000], logoSrc, name, teamId: "CHA" }],
        },
      ],
    },
  },
  {
    kind: "team-season-scatter",
    payload: {
      data: [
        {
          isSurpriseTeam: true,
          logoSrc,
          overUnder: 20,
          pace: 1,
          recordFmt: "31 - 51",
          seasonRange: "2025–26",
          teamName: name,
        },
      ],
    },
  },
];
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const { kind, payload } of cases) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    await page.route(/\/logo(?:%22|")\.svg\?/, (route) =>
      route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"/>',
        contentType: "image/svg+xml",
      }),
    );
    const url = new URL("/stats/", base).href;
    await page.route(url, async (route) => {
      const response = await route.fetch();
      let replacements = 0;
      const html = await response.text();
      const body = html.replace(
        new RegExp(
          String.raw`(<div\b[^>]*data-chart="${kind}"[^>]*>\s*<script\b[^>]*>)[\s\S]*?(</script>)`,
        ),
        (_match, start, end) => {
          replacements++;
          return `${start}${JSON.stringify(payload).replaceAll("<", String.raw`\u003c`)}${end}`;
        },
      );
      assert.equal(replacements, 1, "replace exactly one real chart payload");
      await route.fulfill({ body, response });
    });
    await page.goto(url, { waitUntil: "networkidle" });
    const host = page.locator(`[data-chart="${kind}"]`);
    await host.scrollIntoViewIfNeeded();
    const svg = host.locator('svg[data-renderer="tanstack"]').first();
    await svg.waitFor();
    await svg.focus();
    await page.keyboard.press("Home");
    const tip = host.locator(".tracker-tooltip");
    assert.equal(await tip.isVisible(), true);
    const images = tip.locator("img");
    assert.equal(await images.count(), 1);
    assert.equal(await images.getAttribute("alt"), `Logo for ${name}`);
    assert.equal(await images.getAttribute("src"), logoSrc);
    assert.equal(await tip.locator("historic, script, [onerror]").count(), 0);
    const text = await tip.textContent();
    assert.ok(text.includes(name));
    assert.equal(
      await page.evaluate(() =>
        Object.hasOwn(document.documentElement.dataset, "chartInjection"),
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS: real season/team/history/scatter tooltip DOM preserves literal labels and safe image attributes",
  );
} finally {
  await browser.close();
}

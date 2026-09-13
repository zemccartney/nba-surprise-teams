// D1/D3 rendered-page regressions. Run against dev or built preview.
import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values } = parseArgs({
  options: { base: { default: "http://localhost:4322", type: "string" } },
});
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    reducedMotion: "reduce",
    viewport: { height: 900, width: 1440 },
  });
  const props = (host) =>
    host
      .locator('script[type="application/json"]')
      .textContent()
      .then(JSON.parse);
  const focus = async (host) => {
    await host.scrollIntoViewIfNeeded();
    await host.focus();
    await page.waitForFunction(
      (element) => element.getAttribute("role") === "slider",
      await host.elementHandle(),
    );
    await page.keyboard.press("Home");
  };

  for (const [path, pace] of [
    ["2004/CHI/", 4],
    ["2006/TOR/", 4],
    ["2012/GSW/", 1],
  ]) {
    await page.goto(new URL(path, values.base).href, {
      waitUntil: "networkidle",
    });
    const row = page
      .locator("tr")
      .filter({ hasText: "Pace (Projected Record)" });
    const cell = await row.locator("td").textContent();
    assert.equal(cell.trim(), `+${pace} (47 - 35)`);
    const chart = page.locator('[data-chart="team-season-pace"]');
    const chartProps = await props(chart);
    const last = chartProps.data.at(-1);
    assert.equal(last.projectedWins, 47);
    assert.equal(last.pace, pace);
    await focus(chart);
    await page.keyboard.press("End");
    assert.match(
      await chart.getAttribute("aria-valuetext"),
      /Projected wins 47\./,
    );
    console.log(`${path}: +${pace} (47 - 35), including chart endpoint`);
  }

  await page.goto(new URL("stats/", values.base).href, {
    waitUntil: "networkidle",
  });
  const scatter = await props(
    page.locator('[data-chart="team-season-scatter"]'),
  );
  for (const [seasonRange, teamName, pace] of [
    ["'04-05", "Chicago Bulls", 4],
    ["'06-07", "Toronto Raptors", 4],
    ["'12-13", "Golden State Warriors", 1],
  ]) {
    const point = scatter.data.find(
      (entry) =>
        entry.seasonRange === seasonRange && entry.teamName === teamName,
    );
    assert.ok(point);
    assert.equal(point.recordFmt, "47 - 35");
    assert.equal(point.pace, pace);
  }
  console.log(
    "Stats scatter: all three corrected pace values and unchanged actual records",
  );

  const seasons = page.locator('[data-chart="surprises-per-season"]');
  const seasonProps = await props(seasons);
  const seasonData = seasonProps.data.toSorted(
    (a, b) => Number(a.seasonId) - Number(b.seasonId),
  );
  const index = seasonData.findIndex((entry) => entry.seasonId === "2013");
  assert.ok(index !== -1);
  assert.equal(
    seasonData[index].surpriseTeams.find((team) => team.teamId === "CHA")?.name,
    "Charlotte Bobcats",
  );
  await focus(seasons);
  for (let i = 0; i < index; i++) await page.keyboard.press("ArrowRight");
  assert.match(
    await seasons.getAttribute("aria-valuetext"),
    /Charlotte Bobcats/,
  );
  await page.waitForFunction(() =>
    document
      .querySelector('[data-chart="surprises-per-season"] .tooltip-list')
      ?.textContent.includes("Charlotte Bobcats"),
  );
  console.log(
    "2013 season: Charlotte Bobcats in rendered data, tooltip and spoken value",
  );

  const teams = page.locator('[data-chart="surprises-by-team"]');
  const teamProps = await props(teams);
  const teamData = teamProps.data;
  const netsIndex = teamData.findIndex((entry) => entry.teamId === "BKN");
  assert.ok(netsIndex !== -1);
  await focus(teams);
  for (let i = 0; i < netsIndex; i++) await page.keyboard.press("ArrowRight");
  const spoken = await teams.getAttribute("aria-valuetext");
  assert.match(spoken, /New Jersey Nets, 1977 to 2012/);
  assert.match(spoken, /Brooklyn Nets, 2012 to present/);
  await page.waitForFunction(() => {
    const text = document.querySelector(
      '[data-chart="surprises-by-team"] .tooltip-list',
    )?.textContent;
    return (
      text?.includes("New Jersey Nets (1977 - 2012)") &&
      text.includes("Brooklyn Nets (2012 - present)")
    );
  });
  console.log("Nets: correct historical names in tooltip and spoken value");
} finally {
  await browser.close();
}

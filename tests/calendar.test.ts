import { expect, it } from "vitest";

import { getEasternYYYYMMDD } from "../src/data/calendar";

it("does not advance the NBA calendar at UTC midnight during daylight time", () => {
  expect(getEasternYYYYMMDD(new Date("2030-04-12T02:00:00Z"))).toBe(
    "2030-04-11",
  );
  expect(getEasternYYYYMMDD(new Date("2030-04-12T04:00:00Z"))).toBe(
    "2030-04-12",
  );
});
it("uses the winter offset too, independent of the machine timezone", () => {
  expect(getEasternYYYYMMDD(new Date("2030-11-20T04:59:59Z"))).toBe(
    "2030-11-19",
  );
  expect(getEasternYYYYMMDD(new Date("2030-11-20T05:00:00Z"))).toBe(
    "2030-11-20",
  );
});

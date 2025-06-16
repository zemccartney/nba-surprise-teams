import type { ImageMetadata } from "astro";

/***
 *
 * DATES & TIMES
 *
 * ***/

export const minToMs = (min: number) => min * 60 * 1000;

export const signedFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
});

const easternFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/New_York",
  year: "numeric",
});

/*
  Given a date in the system timezone, return the current date, formatted as YYYY-MM-DD, 
  in the US Eastern timezone. Useful for date comparisons given the NBA scheduling data is all relative to that timezone

  https://community.cloudflare.com/t/cf-worker-determine-time-of-day-timezone/179405
*/
// TODO Somehow call out that this is suitable only in on-demand-rendered paths?
export const getEasternYYYYMMDD = (date: Date) => {
  const parts = easternFormatter.formatToParts(date); // e.g. array representing 03/02/2025

  // formatter should guarantee these parts exist
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const day = parts.find((p) => p.type === "day")!;
  const month = parts.find((p) => p.type === "month")!;
  const year = parts.find((p) => p.type === "year")!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  return `${year.value}-${month.value}-${day.value}`;
};

// TODO Somehow call out that this is suitable only in on-demand-rendered paths?
export const getCurrentEasternYYYYMMDD = () => getEasternYYYYMMDD(new Date());

/***
 *
 * MISC
 *
 * ***/

export const getEmoji = (emoji: string) => {
  const imgs = import.meta.glob<{ default: ImageMetadata }>(
    "./assets/images/emoji/*.svg",
  );

  const matchedPath = imgs[`./assets/images/emoji/${emoji}.svg`];

  if (!matchedPath) {
    throw new Error("[getEmoji] emoji not found");
  }

  // Unwrap so output is passable directly to Astro's Image component's src property
  return matchedPath();
};

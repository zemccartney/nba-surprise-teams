import type { ImageMetadata } from "astro";

import resolveConfig from "tailwindcss/resolveConfig";

import tailwindConfig from "../tailwind.config.mjs";

/***
 *
 * TYPES
 *
 * ***/

export type DeepReadonly<T> = T extends (infer R)[]
  ? readonly DeepReadonly<R>[]
  : // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/***
 *
 * DATES & TIMES
 *
 * ***/

export const minToMs = (min: number) => min * 60 * 1000;

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

export const getTheme = () => resolveConfig(tailwindConfig).theme;

// TODO Actually understand this; pulled in from Claude, didn't take time to process fully
// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#deep_freezing
export const deepFreeze = <T>(object: T): Readonly<DeepReadonly<T>> => {
  if (!object || typeof object !== "object") {
    throw new Error("non-object provided to deepFreeze");
  }

  // Retrieve the property names defined on object
  const propNames = Reflect.ownKeys(object);

  // Freeze properties before freezing self
  for (const name of propNames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (object as any)[name];

    if ((value && typeof value === "object") || typeof value === "function") {
      deepFreeze(value);
    }
  }

  return Object.freeze(object) as Readonly<DeepReadonly<T>>;
};

export const getEmoji = (emoji: string) => {
  const imgs = import.meta.glob("./assets/images/emoji/*.svg");
  if (!imgs[`./assets/images/emoji/${emoji}.svg`]) {
    emoji = "question";
  }

  return (
    imgs[`./assets/images/emoji/${emoji}.svg`] as unknown as () => Promise<{
      default: ImageMetadata;
    }>
  )();
};

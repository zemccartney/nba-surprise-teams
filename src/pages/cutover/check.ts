import type { APIRoute } from "astro";

import * as Sentry from "@sentry/cloudflare";
import { PUBLIC_DEPLOY_ENV } from "astro:env/client";
import { env } from "cloudflare:workers";
// TEMPORARY authenticated preview diagnostic. Remove before production cutover.
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import LiveLoader, { LIVE_DATA_VERSION } from "../../loaders/live";
import {
  decodeLiveCache,
  NBA_SCHEDULE_HEADERS,
  NBA_SCHEDULE_URL,
  SeasonDataSchema,
} from "../../loaders/live/utils";

// Astro requires this export name.
// eslint-disable-next-line unicorn/consistent-boolean-name
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = (env as unknown as { CUTOVER_PROBE_TOKEN?: string })
    .CUTOVER_PROBE_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (
    PUBLIC_DEPLOY_ENV !== "preview" ||
    !secret ||
    !supplied ||
    !timingSafeEqual(
      createHash("sha256").update(secret).digest(),
      createHash("sha256").update(supplied).digest(),
    )
  ) {
    return new Response("Not found", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  if (new URL(request.url).searchParams.has("loader-only")) {
    try {
      const data = await LiveLoader("2026");
      return Response.json(
        { expiresAt: data.expiresAt, games: data.games.length, ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Loader failed",
          ok: false,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const profile = new URL(request.url).searchParams.get("network");
  if (profile) {
    const agents: Record<string, string> = {
      browser:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
      identified: "NBASTT/1.0 (+https://nbastt.grepco.net/)",
      node: "node",
      origin: "node",
    };
    const agent = agents[profile];
    if (!agent) return new Response("Unknown profile", { status: 400 });
    try {
      const response = await fetch(NBA_SCHEDULE_URL, {
        headers: {
          ...NBA_SCHEDULE_HEADERS,
          "User-Agent": agent,
          ...(["browser", "origin"].includes(profile) && {
            Origin: "https://www.nba.com",
          }),
        },
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();
      const details = response.ok
        ? {
            bytes: text.length,
            seasonYear: SeasonDataSchema.parse(JSON.parse(text)).leagueSchedule
              .seasonYear,
          }
        : { denial: text.slice(0, 500) };
      return Response.json(
        {
          profile,
          server: response.headers.get("server"),
          status: response.status,
          ...details,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Request failed",
          profile,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const marker = `NBASTT server cutover smoke ${new Date().toISOString()}`;
  const key = `__cutover_smoke:${randomUUID()}`;
  const result: Record<string, unknown> = { key, marker };
  try {
    // Never use a real season key or create fictional games. Exercise the real
    // envelope decoder against an intentionally expired, empty test envelope.
    await env.GAMES_KV.put(
      key,
      JSON.stringify({
        data: { expiresAt: 0, games: [] },
        id: LIVE_DATA_VERSION,
      }),
      { expirationTtl: 300 },
    );
    const cached = decodeLiveCache(
      await env.GAMES_KV.get(key, "text"),
      "2026",
      LIVE_DATA_VERSION,
    );
    result.kv =
      cached.status === "valid" &&
      cached.data.expiresAt === 0 &&
      cached.data.games.length === 0;
    if (!result.kv)
      throw new Error(
        "Preview KV round-trip did not preserve the test envelope",
      );
  } finally {
    await env.GAMES_KV.delete(key);
    result.cleanupDeleteAccepted = true;
  }

  try {
    // Bypass only the action's preseason shortcut, not the real loader's
    // request headers, timeout, upstream schema or season validation.
    const live = await LiveLoader("2026");
    result.nba = {
      expiresAt: live.expiresAt,
      games: live.games.length,
      ok: true,
    };
  } catch (error) {
    result.nba = {
      error: error instanceof Error ? error.message : "Unknown upstream error",
      ok: false,
    };
  }

  Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      // The short-lived diagnostic credential must not enter the smoke event.
      if (event.request) {
        delete event.request.headers;
        delete event.request.data;
      }
      return event;
    });
    result.sentryEventId = Sentry.captureException(new Error(marker), {
      tags: { source: "cutover-preview-probe" },
    });
  });
  result.sentryFlushed = await Sentry.flush(5000);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
};

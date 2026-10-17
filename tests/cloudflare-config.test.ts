import { describe, expect, it } from "vitest";

import config from "../cloudflare.config.ts";

describe("Cloudflare configuration", () => {
  it("keeps production KV and both domains", () => {
    const result = config({ isPreview: false, mode: "production" });
    expect(result.worker.name).toBe("nba-surprise-teams");
    expect(result.worker.env.GAMES_KV.id).toBe(
      "6061594acc5c4fb6b3846b0c78f9e5a3",
    );
    expect(result.worker.domains).toEqual([
      "nbastt.grepco.net",
      "nba-surprise-teams.grepco.net",
    ]);
  });

  it("isolates preview KV and omits production domains", () => {
    const result = config({ isPreview: true, mode: "production" });
    expect(result.worker.name).toBe("nba-surprise-teams");
    expect(result.worker.env.GAMES_KV.id).toBe(
      "6a0d30705c634691873dd1dd122969e3",
    );
    expect(result.worker.domains).toEqual([]);
    expect(result.worker.env.PUBLIC_DEPLOY_ENV?.value).toBe("preview");
  });
});

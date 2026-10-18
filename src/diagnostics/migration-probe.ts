// Temporary preview-only diagnostic. Delete after hosted verification.
export const probeAuth = {
  expiresAt: 1_792_305_204_104,
  tokenHash: "7e9589252758dfe8e501258c84cfe46d89ad56090e7f75af4919624b79573c43",
};

export async function isProbeAuthorized(
  request: Request,
  environment: unknown,
  auth: { expiresAt: number; tokenHash: string },
  now = Date.now(),
): Promise<boolean> {
  if (environment !== "preview" || now >= auth.expiresAt) return false;
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(header.slice(7)),
  );
  const actual = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return actual === auth.tokenHash;
}

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

function signingKey(): string | null {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  return value ? value : null;
}

export function createOAuthState(userId: string): string {
  const key = signingKey();
  if (!key) {
    throw new Error("GOOGLE_CLIENT_SECRET is not set");
  }

  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + STATE_TTL_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readOAuthState(state: string): { uid: string } | null {
  const key = signingKey();
  if (!key) return null;

  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof data.uid !== "string" || data.uid.length === 0) return null;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { uid: data.uid };
  } catch {
    return null;
  }
}

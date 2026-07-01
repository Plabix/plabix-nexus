import "server-only";

import { randomBytes, createHash } from "node:crypto";

const KEY_PREFIX = "sbk_live_";

export interface GeneratedApiKey {
  /** The full secret, shown to the user exactly once. Never stored. */
  rawKey: string;
  /** Short, non-secret prefix safe to display in a list (e.g. "sbk_live_3f9a"). */
  displayPrefix: string;
  /** SHA-256 hash of the full key, stored in the database for verification. */
  hash: string;
}

/** Generates a new organization API key. The raw key is returned once and never persisted. */
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${KEY_PREFIX}${secret}`;
  return {
    rawKey,
    displayPrefix: rawKey.slice(0, KEY_PREFIX.length + 4),
    hash: hashApiKey(rawKey),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

import { createAdminClient } from "@/lib/supabase/admin";

/** Per-route limits: requests allowed per organization within the window. */
export const RATE_LIMITS = {
  chat: { maxEvents: 30, windowSeconds: 60 },
  upload: { maxEvents: 20, windowSeconds: 60 },
  mutate: { maxEvents: 60, windowSeconds: 60 },
} as const;

export type RateLimitedRoute = keyof typeof RATE_LIMITS;

/**
 * Sliding-window rate limit, scoped per-organization, backed by a Postgres
 * function so it works correctly across concurrent serverless invocations
 * without needing an external store like Redis.
 */
export async function checkRateLimit(
  route: RateLimitedRoute,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { maxEvents, windowSeconds } = RATE_LIMITS[route];

  const { data, error } = await admin.rpc("check_rate_limit", {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_route: route,
    p_max_events: maxEvents,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail open on infrastructure errors so a rate-limit outage doesn't take
    // down the whole product, but the error is surfaced to logs.
    console.error("Rate limit check failed:", error.message);
    return true;
  }

  return data ?? true;
}

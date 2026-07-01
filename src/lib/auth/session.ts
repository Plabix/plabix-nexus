import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Resolves the current authenticated user's profile (which carries their
 * organization_id and role). Throws UnauthorizedError if there is no
 * session — callers in Route Handlers should catch this and return 401.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new UnauthorizedError("Your account isn't fully set up yet. Try signing in again.");
  }

  return profile;
}

/** Like requireProfile, but additionally requires an owner/admin role. */
export async function requireAdminProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "owner" && profile.role !== "admin") {
    throw new ForbiddenError("Only organization admins can do that.");
  }
  return profile;
}

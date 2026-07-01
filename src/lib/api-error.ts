import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/session";

/**
 * Converts a caught error from a Route Handler into a consistent JSON
 * error response with the right HTTP status code. Keeps every route's
 * catch block to a single line instead of re-deriving status codes.
 */
export function apiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  if (error instanceof Error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.error("Unknown error", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export function rateLimitedResponse(): NextResponse {
  return NextResponse.json(
    { error: "You're sending requests too quickly. Wait a moment and try again." },
    { status: 429 }
  );
}

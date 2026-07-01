import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-secondary/40 px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">That link didn&apos;t work</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This confirmation link is invalid or has expired. Request a new one by signing in.
      </p>
      <Button asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}

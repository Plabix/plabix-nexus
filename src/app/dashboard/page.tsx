import Link from "next/link";
import type { Metadata } from "next";
import { FileText, MessagesSquare, ArrowRight, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/session";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ count: documentCount }, { count: readyCount }, { count: sessionCount }, { data: recentDocuments }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)
        .eq("status", "ready"),
      supabase
        .from("chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
      supabase
        .from("documents")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A snapshot of your organization&apos;s knowledge base.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{documentCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{readyCount ?? 0} ready to search</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chat sessions</CardTitle>
            <MessagesSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{sessionCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">across your organization</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/documents">
                <UploadCloud className="size-4" /> Upload a document
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/chat">
                <MessagesSquare className="size-4" /> Start a chat
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent documents</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/documents">
              View all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-2 pb-4">
          {!recentDocuments || recentDocuments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No documents yet. Upload your first one to get started.
            </p>
          ) : (
            recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-md px-4 py-2.5 hover:bg-secondary/60"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(doc.file_size_bytes)}</p>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "processing") return <Badge variant="secondary">Processing</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

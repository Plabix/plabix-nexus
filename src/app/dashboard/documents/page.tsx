import type { Metadata } from "next";

import { DocumentsView } from "@/components/dashboard/documents-view";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return <DocumentsView initialDocuments={documents ?? []} />;
}

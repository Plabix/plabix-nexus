import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/lib/api-error";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { renameDocumentSchema } from "@/lib/validation/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** PATCH /api/documents/:id — rename a document. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const body = renameDocumentSchema.parse(await request.json());

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .update({ title: body.title })
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json({ document: data });
  } catch (error) {
    return apiError(error);
  }
}

/** DELETE /api/documents/:id — remove a document, its chunks, and its file. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (deleteError) throw deleteError;

    // Chunks cascade via FK; the stored file does not, so remove it explicitly.
    await supabase.storage.from("documents").remove([document.storage_path]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

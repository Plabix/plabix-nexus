"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadDialog } from "@/components/dashboard/upload-dialog";
import { formatBytes } from "@/lib/utils";
import type { DocumentRow } from "@/types/database";

const POLL_INTERVAL_MS = 4000;

export function DocumentsView({ initialDocuments }: { initialDocuments: DocumentRow[] }) {
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DocumentRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasInFlight = useMemo(
    () => documents.some((d) => d.status === "pending" || d.status === "processing"),
    [documents]
  );

  async function fetchDocuments(query: string) {
    setIsSearching(true);
    try {
      const url = query ? `/api/documents?q=${encodeURIComponent(query)}` : "/api/documents";
      const response = await fetch(url);
      const payload = await response.json();
      if (response.ok) {
        setDocuments(payload.documents as DocumentRow[]);
      }
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchDocuments(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Poll while any document is still pending/processing so status updates
  // (ready/failed) show up without a manual refresh.
  useEffect(() => {
    if (!hasInFlight) return;
    const interval = setInterval(() => fetchDocuments(search), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasInFlight, search]);

  function handleUploaded(document: DocumentRow) {
    setDocuments((prev) => [document, ...prev]);
  }

  async function handleRename() {
    if (!renameTarget) return;
    setIsRenaming(true);
    try {
      const response = await fetch(`/api/documents/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Rename failed.");
      setDocuments((prev) =>
        prev.map((d) => (d.id === renameTarget.id ? (payload.document as DocumentRow) : d))
      );
      toast.success("Document renamed.");
      setRenameTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rename failed.");
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Delete failed.");
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success("Document deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your organization&apos;s knowledge base.
          </p>
        </div>
        <UploadDialog onUploaded={handleUploaded} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="pl-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No documents found</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search." : "Upload your first document to get started."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{doc.title}</span>
                    </div>
                    {doc.status === "failed" && doc.error_message && (
                      <p className="mt-1 truncate text-xs text-destructive">{doc.error_message}</p>
                    )}
                  </TableCell>
                  <TableCell className="uppercase text-muted-foreground">{doc.file_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatBytes(doc.file_size_bytes)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Document actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTarget(doc);
                            setRenameValue(doc.title);
                          }}
                        >
                          <Pencil className="size-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(doc)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !renameValue.trim()}>
              {isRenaming && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the document and everything indexed from it. Past chat
              answers that cited it will keep their citation text, but it will no longer be
              searchable. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "processing")
    return (
      <Badge variant="secondary">
        <Loader2 className="size-3 animate-spin" /> Processing
      </Badge>
    );
  return <Badge variant="outline">Pending</Badge>;
}

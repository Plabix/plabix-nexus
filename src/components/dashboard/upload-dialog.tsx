"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatBytes } from "@/lib/utils";
import type { DocumentRow } from "@/types/database";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.md,.markdown";
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export function UploadDialog({ onUploaded }: { onUploaded: (document: DocumentRow) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setTitle("");
    setIsDragging(false);
  }

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > MAX_SIZE_BYTES) {
      toast.error("Files must be 25 MB or smaller.");
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^./]+$/, ""));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);

      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const document = payload.document as DocumentRow;
      if (document.status === "failed") {
        toast.error(document.error_message ?? "Document failed to process.");
      } else {
        toast.success("Document uploaded and indexed.");
      }
      onUploaded(document);
      setOpen(false);
      resetState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="size-4" /> Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            PDF, Word (.docx), plain text, or Markdown — up to 25 MB. It will be chunked and
            embedded automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors",
              isDragging && "border-primary bg-secondary/50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              selectFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <UploadCloud className="size-6 text-muted-foreground" />
            {file ? (
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag a file here, or{" "}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  browse
                </button>
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Employee Handbook 2026"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading && <Loader2 className="size-4 animate-spin" />}
              {isUploading ? "Uploading & indexing…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

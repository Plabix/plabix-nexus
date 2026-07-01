"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { MemberRole } from "@/types/database";

type ApiKeySummary = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function ApiKeysSettings({ role }: { role: MemberRole }) {
  const canManage = role === "owner" || role === "admin";
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  async function loadKeys() {
    if (!canManage) {
      setIsLoading(false);
      return;
    }
    const response = await fetch("/api/api-keys");
    const payload = await response.json();
    if (response.ok) setKeys(payload.apiKeys as ApiKeySummary[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Couldn't create key.");
      setKeys((prev) => [payload.apiKey as ApiKeySummary, ...prev]);
      setRevealedKey(payload.rawKey as string);
      setCreateOpen(false);
      setNewKeyName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create key.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const response = await fetch(`/api/api-keys/${revokeTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Couldn't revoke key.");
      setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
      toast.success("Key revoked.");
      setRevokeTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't revoke key.");
    } finally {
      setIsRevoking(false);
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Only organization owners and admins can manage API keys.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Use these for programmatic access to your organization.</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Give it a name so you can identify it later.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Production server"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
                {isCreating && <Loader2 className="size-4 animate-spin" />}
                Create key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium">{key.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}…</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Revoke key"
                onClick={() => setRevokeTarget(key)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      {/* Reveal the raw key exactly once */}
      <Dialog open={!!revealedKey} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your key now</DialogTitle>
            <DialogDescription>
              This is the only time you&apos;ll see the full key. Store it somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={revealedKey ?? ""} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy key"
              onClick={() => {
                if (revealedKey) {
                  navigator.clipboard.writeText(revealedKey);
                  toast.success("Copied to clipboard.");
                }
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &quot;{revokeTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this key will immediately lose access. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevoke();
              }}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="size-4 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

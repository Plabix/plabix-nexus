"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberRole } from "@/types/database";

export function OrganizationSettings({
  initialName,
  role,
}: {
  initialName: string;
  role: MemberRole;
}) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const canEdit = role === "owner" || role === "admin";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Couldn't save changes.");
      toast.success("Organization updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>This name appears throughout your workspace.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-1.5">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            maxLength={120}
          />
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              Only organization owners and admins can change this.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!canEdit || isSaving || !name.trim()}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

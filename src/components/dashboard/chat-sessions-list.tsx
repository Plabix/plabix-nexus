"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/database";

export function ChatSessionsList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const params = useParams<{ sessionId?: string }>();

  async function loadSessions() {
    const response = await fetch("/api/chat/sessions");
    const payload = await response.json();
    if (response.ok) setSessions(payload.sessions as ChatSession[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleNewChat() {
    setIsCreating(true);
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Couldn't start a new chat.");
      router.push(`/dashboard/chat/${payload.session.id}`);
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start a new chat.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const response = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Couldn't delete that chat.");
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (params.sessionId === id) router.push("/dashboard/chat");
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border">
      <div className="border-b border-border p-3">
        <Button onClick={handleNewChat} disabled={isCreating} className="w-full">
          {isCreating ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No chats yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {sessions.map((session) => {
              const isActive = params.sessionId === session.id;
              return (
                <li key={session.id}>
                  <Link
                    href={`/dashboard/chat/${session.id}`}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="truncate">{session.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(session.id, e)}
                      aria-label="Delete chat"
                      className={cn(
                        "shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100",
                        isActive ? "hover:bg-primary-foreground/20" : "hover:bg-muted"
                      )}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

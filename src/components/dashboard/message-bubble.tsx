import { Bot, User } from "lucide-react";

import { CitationChip } from "@/components/dashboard/citation-chip";
import { cn } from "@/lib/utils";
import type { Citation, MessageRole } from "@/types/database";

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

/** Splits text on [n] markers and renders each as a citation chip when role is assistant. */
function renderContent(content: string, citations: Citation[]) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <span key={i}>{part}</span>;
    const number = Number(match[1]);
    return <CitationChip key={i} number={number} citation={citations[number - 1]} />;
  });
}

export function MessageBubble({ role, content, citations = [], isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={cn(
          "max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        )}
      >
        <p className="whitespace-pre-wrap">
          {isUser ? content : renderContent(content, citations)}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />
          )}
        </p>
        {!isUser && citations.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted-foreground">
            {citations.map((c, i) => (
              <div key={c.chunkId} className="flex items-center gap-1.5">
                <span className="inline-flex size-3.5 items-center justify-center rounded-sm bg-accent text-[9px] font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span className="truncate">{c.documentTitle}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

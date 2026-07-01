import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chat" };

export default function ChatIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <MessagesSquare className="size-10 text-muted-foreground" />
      <p className="font-medium">Ask a question about your documents</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Start a new chat to ask anything covered in your uploaded knowledge base — every answer
        comes with citations back to the source.
      </p>
    </div>
  );
}

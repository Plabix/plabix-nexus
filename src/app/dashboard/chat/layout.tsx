import { ChatSessionsList } from "@/components/dashboard/chat-sessions-list";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSessionsList />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

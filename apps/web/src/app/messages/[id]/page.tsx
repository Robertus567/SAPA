import { ChatRoom } from "@/components/chat-room";

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatRoom conversationId={id} />;
}


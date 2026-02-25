'use client';

import
  {
    api,
    Conversation,
    Message,
    useGetAuthUserQuery,
    useGetConversationsQuery,
    useGetMessagesQuery,
    useSendMessageMutation,
  } from '@/state/api';
import { PusherEvents, usePusher } from '@/state/pusher';
import { useAppDispatch } from '@/state/redux';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function MessageInbox() {
  const { data: authUser } = useGetAuthUserQuery();
  const { channel } = usePusher();
  const dispatch = useAppDispatch();
  const [selectedPartner, setSelectedPartner] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, refetch: refetchConversations } = useGetConversationsQuery(
    authUser?.cognitoInfo?.userId || '',
    { skip: !authUser?.cognitoInfo?.userId }
  );

  const { data: messages, refetch: refetchMessages } = useGetMessagesQuery(
    {
      cognitoId: authUser?.cognitoInfo?.userId || '',
      partnerId: selectedPartner?.id || '',
    },
    { skip: !authUser?.cognitoInfo?.userId || !selectedPartner }
  );

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time messages via Pusher
  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = () => {
      // Invalidate and refetch messages and conversations
      dispatch(api.util.invalidateTags(['Messages']));
      refetchMessages();
      refetchConversations();
    };

    channel.bind(PusherEvents.NEW_MESSAGE, handleNewMessage);

    return () => {
      channel.unbind(PusherEvents.NEW_MESSAGE, handleNewMessage);
    };
  }, [channel, dispatch, refetchMessages, refetchConversations]);

  // Fallback: Poll for new messages every 30 seconds when Pusher isn't connected
  useEffect(() => {
    if (!selectedPartner || channel) return;
    const interval = setInterval(() => {
      refetchMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedPartner, refetchMessages, channel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartner || !authUser) return;

    await sendMessage({
      content: newMessage.trim(),
      receiverCognitoId: selectedPartner.id,
      receiverType: selectedPartner.type,
    });

    setNewMessage('');
    refetchMessages();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Please sign in to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Conversations List */}
      <div
        className={`w-full md:w-1/3 border-r ${
          selectedPartner ? 'hidden md:block' : ''
        }`}
      >
        <div className="p-4 border-b">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)]">
          {conversations && conversations.length > 0 ? (
            conversations.map((conv: Conversation) => (
              <button
                key={conv.partnerId}
                onClick={() =>
                  setSelectedPartner({
                    id: conv.partnerId,
                    name: conv.partnerName,
                    type: conv.partnerType,
                  })
                }
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b text-left ${
                  selectedPartner?.id === conv.partnerId ? 'bg-blue-50' : ''
                }`}
              >
                <Avatar>
                  <AvatarFallback>{conv.partnerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{conv.partnerName}</p>
                    <span className="text-xs text-gray-500">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
              <p>No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages View */}
      <div
        className={`flex-1 flex flex-col ${
          selectedPartner ? '' : 'hidden md:flex'
        }`}
      >
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <button
                onClick={() => setSelectedPartner(null)}
                className="md:hidden p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar>
                <AvatarFallback>{selectedPartner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedPartner.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {selectedPartner.type}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages?.map((msg: Message) => {
                const isOwnMessage =
                  msg.senderCognitoId === authUser.cognitoInfo?.userId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isOwnMessage
                          ? 'bg-secondary-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-50' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose from your existing conversations</p>
          </div>
        )}
      </div>
    </div>
  );
}

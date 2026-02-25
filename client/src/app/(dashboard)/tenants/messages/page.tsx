'use client';

import { MessageInbox } from '@/components/messages/MessageInbox';

export default function TenantMessagesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <p className="text-gray-600 mb-6">
        Chat with property managers about applications, leases, payments, and more.
      </p>
      <MessageInbox />
    </div>
  );
}

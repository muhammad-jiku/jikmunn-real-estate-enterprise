'use client';

import { MessageInbox } from '@/components/messages/MessageInbox';

export default function ManagerMessagesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <p className="text-gray-600 mb-6">
        Chat with tenants about properties, applications, leases, and payments.
      </p>
      <MessageInbox />
    </div>
  );
}

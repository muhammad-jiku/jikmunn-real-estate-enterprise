'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useSendMessageMutation } from '@/state/api';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SendMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientType: 'tenant' | 'manager';
  propertyId?: number;
  propertyName?: string;
  context?: string; // e.g., "application", "lease", "payment"
}

export function SendMessageDialog({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientType,
  propertyId,
  propertyName,
  context,
}: SendMessageDialogProps) {
  const router = useRouter();
  const [messageContent, setMessageContent] = useState('');
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;

    try {
      const payload: {
        content: string;
        receiverCognitoId: string;
        receiverType: 'tenant' | 'manager';
        propertyId?: number;
      } = {
        content: messageContent.trim(),
        receiverCognitoId: recipientId,
        receiverType: recipientType,
      };

      // Only include propertyId if it's defined
      if (propertyId !== undefined && propertyId !== null) {
        payload.propertyId = propertyId;
      }

      await sendMessage(payload).unwrap();

      setMessageContent('');
      onClose();

      // Navigate to messages
      const messagesPath = recipientType === 'tenant' ? '/managers/messages' : '/tenants/messages';
      router.push(messagesPath);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getPlaceholder = () => {
    if (context === 'application') {
      return `Hi ${recipientName}, regarding your application for ${propertyName || 'this property'}...`;
    }
    if (context === 'lease') {
      return `Hi ${recipientName}, regarding your lease for ${propertyName || 'this property'}...`;
    }
    if (context === 'payment') {
      return `Hi ${recipientName}, regarding the payment for ${propertyName || 'this property'}...`;
    }
    return `Hi ${recipientName}...`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message {recipientName}
          </DialogTitle>
          <DialogDescription>
            {propertyName ? `Send a message about ${propertyName}` : 'Send a direct message'}
            {context && ` (${context})`}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder={getPlaceholder()}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="min-h-30"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSendMessage} disabled={isSending || !messageContent.trim()}>
            {isSending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MessageButtonProps {
  recipientId: string;
  recipientName: string;
  recipientType: 'tenant' | 'manager';
  propertyId?: number;
  propertyName?: string;
  context?: string;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function MessageButton({
  recipientId,
  recipientName,
  recipientType,
  propertyId,
  propertyName,
  context,
  variant = 'outline',
  className,
}: MessageButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button variant={variant} className={className} onClick={() => setIsDialogOpen(true)}>
        <MessageSquare className="w-4 h-4 mr-2" />
        Message
      </Button>
      <SendMessageDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        recipientId={recipientId}
        recipientName={recipientName}
        recipientType={recipientType}
        propertyId={propertyId}
        propertyName={propertyName}
        context={context}
      />
    </>
  );
}

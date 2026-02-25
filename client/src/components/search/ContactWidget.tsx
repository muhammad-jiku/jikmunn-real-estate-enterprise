import { Button } from '@/components/ui/button';
import { useGetAuthUserQuery, useGetPropertyQuery, useSendMessageMutation } from '@/state/api';
import { MessageSquare, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

const ContactWidget = ({ onOpenModal, propertyId }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId);
  const router = useRouter();
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push('/signin');
    }
  };

  const handleMessageManager = () => {
    if (authUser) {
      setIsMessageDialogOpen(true);
    } else {
      router.push('/signin');
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !property?.manager?.cognitoId) return;

    try {
      await sendMessage({
        content: messageContent.trim(),
        receiverCognitoId: property.manager.cognitoId,
        receiverType: 'manager',
        propertyId,
      }).unwrap();

      setMessageContent('');
      setIsMessageDialogOpen(false);
      router.push('/tenants/messages');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <>
      <div className="bg-white border border-primary-200 rounded-2xl p-7 h-fit min-w-75">
        {/* Contact Property */}
        <div className="flex items-center gap-5 mb-4 border border-primary-200 p-4 rounded-xl">
          <div className="flex items-center p-4 bg-primary-900 rounded-full">
            <Phone className="text-primary-50" size={15} />
          </div>
          <div>
            <p>Contact This Property</p>
            <div className="text-lg font-bold text-primary-800">
              {property?.manager?.phoneNumber || '(424) 340-5574'}
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-primary-700 text-white hover:bg-primary-600"
          onClick={handleButtonClick}
        >
          {authUser ? 'Submit Application' : 'Sign In to Apply'}
        </Button>

        {/* Message Manager Button */}
        {authUser && authUser.userRole === 'tenant' && property?.manager && (
          <Button
            variant="outline"
            className="w-full mt-3 border-primary-700 text-primary-700 hover:bg-primary-50"
            onClick={handleMessageManager}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Manager
          </Button>
        )}

        <hr className="my-4" />
        <div className="text-sm">
          {property?.manager?.name && (
            <div className="text-primary-800 font-medium mb-2">
              Managed by {property.manager.name}
            </div>
          )}
          <div className="text-primary-600 mb-1">Language: English, Bahasa.</div>
          <div className="text-primary-600">Open by appointment on Monday - Sunday</div>
        </div>
      </div>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Manager</DialogTitle>
            <DialogDescription>
              Send a message to {property?.manager?.name} about {property?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={`Hi, I'm interested in ${property?.name}. I would like to know more about...`}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="min-h-30"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={isSending || !messageContent.trim()}>
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactWidget;

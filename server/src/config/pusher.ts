import Pusher from 'pusher';
import { config } from './index.config';

// Initialize Pusher only if credentials are available
const pusher = new Pusher({
  appId: config.pusher.appId,
  key: config.pusher.key,
  secret: config.pusher.secret,
  cluster: config.pusher.cluster,
  useTLS: true,
});

// Check if Pusher is properly configured
export const isPusherConfigured = (): boolean => {
  return !!(
    config.pusher.appId &&
    config.pusher.key &&
    config.pusher.secret &&
    config.pusher.cluster
  );
};

// Channel naming conventions
export const getPrivateChannel = (userId: string): string => {
  return `private-user-${userId}`;
};

export const getMessageChannel = (userId1: string, userId2: string): string => {
  // Create consistent channel name regardless of sender/receiver order
  const sortedIds = [userId1, userId2].sort();
  return `private-conversation-${sortedIds[0]}-${sortedIds[1]}`;
};

// Event types
export enum PusherEvents {
  NEW_MESSAGE = 'new-message',
  NEW_NOTIFICATION = 'new-notification',
  NOTIFICATION_READ = 'notification-read',
  MESSAGE_READ = 'message-read',
}

// Trigger a new message event
export const triggerNewMessage = async (
  receiverId: string,
  message: {
    id: number;
    content: string;
    senderName: string;
    senderId: string;
    propertyId?: number;
    createdAt: string;
  }
): Promise<void> => {
  if (!isPusherConfigured()) {
    console.info('Pusher not configured, skipping real-time notification');
    return;
  }

  try {
    await pusher.trigger(
      getPrivateChannel(receiverId),
      PusherEvents.NEW_MESSAGE,
      message
    );
  } catch (error) {
    console.error('Failed to trigger Pusher message event:', error);
  }
};

// Trigger a new notification event
export const triggerNewNotification = async (
  userId: string,
  notification: {
    id: number;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
  }
): Promise<void> => {
  if (!isPusherConfigured()) {
    console.info('Pusher not configured, skipping real-time notification');
    return;
  }

  try {
    await pusher.trigger(
      getPrivateChannel(userId),
      PusherEvents.NEW_NOTIFICATION,
      notification
    );
  } catch (error) {
    console.error('Failed to trigger Pusher notification event:', error);
  }
};

export default pusher;

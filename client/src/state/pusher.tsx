'use client';

import Pusher from 'pusher-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useGetAuthUserQuery } from './api';

// Enable Pusher logging in development
if (process.env.NODE_ENV === 'development') {
  Pusher.logToConsole = true;
}

interface PusherContextType {
  pusher: Pusher | null;
  channel: ReturnType<Pusher['subscribe']> | null;
  isConnected: boolean;
}

const PusherContext = createContext<PusherContextType>({
  pusher: null,
  channel: null,
  isConnected: false,
});

export const usePusher = () => useContext(PusherContext);

// Pusher event types
export enum PusherEvents {
  NEW_MESSAGE = 'new-message',
  NEW_NOTIFICATION = 'new-notification',
  NOTIFICATION_READ = 'notification-read',
  MESSAGE_READ = 'message-read',
}

interface PusherProviderProps {
  children: ReactNode;
}

export const PusherProvider = ({ children }: PusherProviderProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const [isConnected, setIsConnected] = useState(false);

  const { pusher, channel } = useMemo(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    const userId = authUser?.cognitoInfo?.userId;

    if (!pusherKey || !pusherCluster || !userId) {
      return { pusher: null, channel: null };
    }

    const pusherClient = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    // Subscribe to user's channel (using public channel to avoid auth endpoint requirement)
    // For private channel auth, a server endpoint would be needed at /pusher/auth
    const channelName = `user-${userId}`;
    const userChannel = pusherClient.subscribe(channelName);

    return { pusher: pusherClient, channel: userChannel };
  }, [authUser?.cognitoInfo?.userId]);

  useEffect(() => {
    if (!pusher) return;

    const handleStateChange = (states: { current: string; previous: string }) => {
      setIsConnected(states.current === 'connected');
    };

    pusher.connection.bind('state_change', handleStateChange);
    setIsConnected(pusher.connection.state === 'connected');

    return () => {
      pusher.connection.unbind('state_change', handleStateChange);
      pusher.disconnect();
    };
  }, [pusher]);

  return (
    <PusherContext.Provider value={{ pusher, channel, isConnected }}>
      {children}
    </PusherContext.Provider>
  );
};

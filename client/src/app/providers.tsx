'use client';

import { PusherProvider } from '@/state/pusher';
import StoreProvider from '@/state/redux';
import { ClerkProvider } from '@clerk/nextjs';
import Auth from './(auth)/authProvider';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <StoreProvider>
        <Auth>
          <PusherProvider>{children}</PusherProvider>
        </Auth>
      </StoreProvider>
    </ClerkProvider>
  );
};

export default Providers;

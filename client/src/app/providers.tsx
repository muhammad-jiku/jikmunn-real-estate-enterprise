'use client';

import { PusherProvider } from '@/state/pusher';
import StoreProvider from '@/state/redux';
import { Authenticator } from '@aws-amplify/ui-react';
import Auth from './(auth)/authProvider';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <Authenticator.Provider>
        <Auth>
          <PusherProvider>{children}</PusherProvider>
        </Auth>
      </Authenticator.Provider>
    </StoreProvider>
  );
};

export default Providers;

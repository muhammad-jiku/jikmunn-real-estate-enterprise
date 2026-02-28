'use client';

import { setAuthToken, setCachedUserInfo, setGetTokenFn } from '@/lib/authStore';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

/**
 * Hook to sync Clerk authentication state with RTK Query.
 * This should be used in the root layout or providers.
 */
export const useAuthSync = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // Store the getToken function so API can get fresh tokens
  useEffect(() => {
    // Don't do anything until Clerk is fully loaded
    if (!isLoaded) return;

    if (isSignedIn) {
      setGetTokenFn(getToken);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    // Don't do anything until Clerk is fully loaded
    if (!isLoaded) return;

    const syncToken = async () => {
      if (isSignedIn) {
        const token = await getToken();
        setAuthToken(token);

        if (user) {
          // Don't default to 'tenant' - role must be explicitly set
          // This prevents auto-creating tenant records before role is selected
          setCachedUserInfo({
            userId: user.id,
            role: (user.unsafeMetadata?.role as string) || '',
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.username || user.firstName || 'User',
          });
        }
      } else {
        setAuthToken(null);
        setCachedUserInfo(null);
      }
    };

    syncToken();

    // Refresh token periodically (every 50 seconds, tokens expire in 60)
    const interval = setInterval(syncToken, 50000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, getToken, user]);
};

'use client';

import { useAuthSync } from '@/hooks/useAuthSync';
import { useAuth, useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Function to create user in database after successful sign-up
async function createUserInDatabaseAfterAuth(
  userId: string,
  userRole: string,
  username: string,
  email: string,
  token: string
) {
  try {
    const normalizedRole = userRole.toLowerCase();
    const checkEndpoint =
      normalizedRole === 'manager' ? `/managers/${userId}` : `/tenants/${userId}`;

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    console.log('[Auth] Checking if user exists:', {
      baseUrl,
      checkEndpoint,
      clerkId: userId,
      userRole: normalizedRole,
    });

    // First check if user already exists
    const checkResponse = await fetch(`${baseUrl}${checkEndpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[Auth] Check response status:', checkResponse.status);

    if (checkResponse.status === 404) {
      // User doesn't exist, create them
      const createEndpoint = normalizedRole === 'manager' ? '/managers' : '/tenants';

      console.log('[Auth] Creating new user in database:', {
        clerkId: userId,
        role: normalizedRole,
        endpoint: `${baseUrl}${createEndpoint}`,
      });

      const createResponse = await fetch(`${baseUrl}${createEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cognitoId: userId, // Keep field name for DB compatibility
          name: username,
          email: email,
          phoneNumber: '',
        }),
      });

      console.log('[Auth] Create response status:', createResponse.status);

      if (createResponse.ok) {
        const data = await createResponse.json();
        console.log('[Auth] User created successfully:', data);
      } else {
        const errorText = await createResponse.text();
        console.error('[Auth] Failed to create user:', errorText);
      }
    } else if (checkResponse.ok) {
      console.log('[Auth] User already exists in database');
    } else {
      console.error('[Auth] Unexpected check response:', checkResponse.status);
    }
  } catch (error) {
    console.error('[Auth] Error in createUserInDatabaseAfterAuth:', error);
  }
}

const Auth = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const hasCreatedUser = useRef(false);

  // Sync Clerk token to RTK Query auth store
  useAuthSync();

  const isAuthPage = pathname.match(
    /^\/(signin|signup|forgot-password|reset-password|select-role)$/
  );
  const isDashboardPage = pathname.startsWith('/manager') || pathname.startsWith('/tenants');

  // Create user in database after sign-in
  useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn && user && !hasCreatedUser.current) {
        hasCreatedUser.current = true;
        console.log('[Auth] User signed in, syncing to database...');

        const userRole = (user.unsafeMetadata?.role as string) || 'tenant';
        const token = await getToken();

        if (token) {
          await createUserInDatabaseAfterAuth(
            user.id,
            userRole,
            user.username || user.firstName || 'User',
            user.emailAddresses[0]?.emailAddress || '',
            token
          );
        }
      }
    };

    syncUser();
  }, [isSignedIn, user, getToken]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (isLoaded && isSignedIn && isAuthPage && pathname !== '/select-role') {
      // Check if user has role set, if not redirect to role selection
      const userRole = user?.unsafeMetadata?.role as string;
      if (!userRole) {
        router.push('/select-role');
      } else {
        router.push('/');
      }
    }
  }, [isLoaded, isSignedIn, isAuthPage, router, user, pathname]);

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-primary-700">Loading...</div>
      </div>
    );
  }

  // Allow access to public pages without authentication
  if (!isAuthPage && !isDashboardPage) {
    return <>{children}</>;
  }

  // Auth pages are handled by Clerk's built-in components
  return <>{children}</>;
};

export default Auth;

# AWS Cognito to Clerk Migration Guide

This guide provides a complete step-by-step process to migrate the Real Estate Enterprise project from AWS Cognito (Amplify) to Clerk authentication.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Current Implementation Analysis](#current-implementation-analysis)
4. [Step 1: Clerk Setup](#step-1-clerk-setup)
5. [Step 2: Client-Side Migration](#step-2-client-side-migration)
6. [Step 3: Server-Side Migration](#step-3-server-side-migration)
7. [Step 4: Database Considerations](#step-4-database-considerations)
8. [Step 5: Testing](#step-5-testing)
9. [Step 6: Cleanup](#step-6-cleanup)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Why Clerk?

| Feature          | AWS Cognito             | Clerk                       |
| ---------------- | ----------------------- | --------------------------- |
| Free Tier        | 50k MAU                 | 10k MAU                     |
| Setup Complexity | High (IAM, User Pools)  | Low (Dashboard-based)       |
| React Components | Amplify UI              | Native components           |
| Custom Claims    | `custom:role` attribute | `publicMetadata.role`       |
| JWT Verification | JWKS endpoint           | `@clerk/express` middleware |
| Webhooks         | Lambda triggers         | Built-in webhooks           |

### Migration Scope

**Files to modify:**

- `client/package.json` - Replace Amplify with Clerk
- `client/src/app/providers.tsx` - Clerk provider setup
- `client/src/app/(auth)/authProvider.tsx` - Full rewrite to Clerk
- `client/src/app/(auth)/signin/page.tsx` - Clerk SignIn
- `client/src/app/(auth)/signup/page.tsx` - Clerk SignUp
- `client/src/app/(auth)/forgot-password/page.tsx` - Clerk forgot password
- `client/src/app/(auth)/reset-password/page.tsx` - Clerk reset password
- `client/src/components/shared/Navbar.tsx` - Clerk auth hooks
- `client/src/state/api.ts` - Clerk token fetching
- `client/src/lib/utils.ts` - User creation helper
- `server/src/app/middleware/auth.ts` - Clerk JWT verification
- `server/package.json` - Add Clerk SDK
- Environment variables

---

## Prerequisites

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new Clerk application
3. Note down your keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## Current Implementation Analysis

### Cognito Token Structure

```typescript
// Current token payload from AWS Cognito
{
  sub: "user-uuid-from-cognito",      // Used as cognitoId in DB
  "custom:role": "tenant" | "manager", // Custom attribute for role
  email: "user@example.com"
}
```

### Database Schema (No Changes Required)

```prisma
model Manager {
  cognitoId String @unique  // Will store Clerk userId
  // ...
}

model Tenant {
  cognitoId String @unique  // Will store Clerk userId
  // ...
}
```

> **Note:** We'll keep the `cognitoId` field name for now to minimize database migration. It will store Clerk's `userId` instead.

---

## Step 1: Clerk Setup

### 1.1 Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new application
3. Choose authentication methods (Email, Google, etc.)
4. Go to **Configure > User & Authentication > Authentication config**

### 1.2 Configure Custom Metadata

In Clerk Dashboard, users can have `publicMetadata` which we'll use for the role:

```json
{
  "role": "tenant" | "manager"
}
```

### 1.3 Create Webhook for User Creation (Important!)

1. Go to **Webhooks** in Clerk Dashboard
2. Add endpoint: `https://your-api-url/webhooks/clerk`
3. Select events: `user.created`, `user.updated`
4. Copy the **Signing Secret**

### 1.4 Environment Variables

**Client (.env.local):**

```env
# Remove these:
# NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=xxx
# NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=xxx

# Add these:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

**Server (.env):**

```env
# Add this:
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
```

---

## Step 2: Client-Side Migration

### 2.1 Update Dependencies

```bash
cd client

# Remove Amplify packages
npm uninstall @aws-amplify/ui-react aws-amplify

# Install Clerk packages
npm install @clerk/nextjs
```

**Updated package.json dependencies:**

```json
{
  "dependencies": {
    "@clerk/nextjs": "^5.0.0"
    // Remove: "@aws-amplify/ui-react", "aws-amplify"
  }
}
```

### 2.2 Create Middleware (New File)

Create `client/src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/search(.*)',
  '/signin(.*)',
  '/signup(.*)',
  '/forgot-password(.*)',
  '/reset-password(.*)',
  '/properties/(.*)',
  '/api/webhooks(.*)',
]);

const isDashboardRoute = createRouteMatcher(['/managers(.*)', '/tenants(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard routes
  if (isDashboardRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### 2.3 Update Providers

**Updated `client/src/app/providers.tsx`:**

```typescript
'use client';

import { PusherProvider } from '@/state/pusher';
import StoreProvider from '@/state/redux';
import { ClerkProvider } from '@clerk/nextjs';

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <StoreProvider>
        <PusherProvider>{children}</PusherProvider>
      </StoreProvider>
    </ClerkProvider>
  );
};

export default Providers;
```

### 2.4 Update Auth Provider (Full Rewrite)

**Updated `client/src/app/(auth)/authProvider.tsx`:**

```typescript
'use client';

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

    // First check if user already exists
    const checkResponse = await fetch(`${baseUrl}${checkEndpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (checkResponse.status === 404) {
      // User doesn't exist, create them
      const createEndpoint = normalizedRole === 'manager' ? '/managers' : '/tenants';

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

      if (!createResponse.ok) {
        console.error('[Auth] Failed to create user:', await createResponse.text());
      }
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

  const isAuthPage = pathname.match(/^\/(signin|signup|forgot-password|reset-password)$/);
  const isDashboardPage = pathname.startsWith('/manager') || pathname.startsWith('/tenants');

  // Create user in database after sign-in
  useEffect(() => {
    const syncUser = async () => {
      if (isSignedIn && user && !hasCreatedUser.current) {
        hasCreatedUser.current = true;

        const userRole = (user.publicMetadata?.role as string) || 'tenant';
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
    if (isLoaded && isSignedIn && isAuthPage) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, isAuthPage, router]);

  // Show loading state
  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Allow access to public pages without authentication
  if (!isAuthPage && !isDashboardPage) {
    return <>{children}</>;
  }

  // Auth pages are handled by Clerk's built-in components
  return <>{children}</>;
};

export default Auth;
```

### 2.5 Update Sign In Page

**Updated `client/src/app/(auth)/signin/page.tsx`:**

```typescript
'use client';

import { SignIn } from '@clerk/nextjs';

const SignInPage = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-muted-foreground',
            formButtonPrimary: 'bg-primary-700 hover:bg-primary-800',
          },
        }}
        routing="path"
        path="/signin"
        signUpUrl="/signup"
        forceRedirectUrl="/"
      />
    </div>
  );
};

export default SignInPage;
```

### 2.6 Update Sign Up Page

**Updated `client/src/app/(auth)/signup/page.tsx`:**

```typescript
'use client';

import { SignUp } from '@clerk/nextjs';

const SignUpPage = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-muted-foreground',
            formButtonPrimary: 'bg-primary-700 hover:bg-primary-800',
          },
        }}
        routing="path"
        path="/signup"
        signInUrl="/signin"
        forceRedirectUrl="/"
        unsafeMetadata={{
          role: 'tenant', // Default role, user can change in settings
        }}
      />
    </div>
  );
};

export default SignUpPage;
```

> **Note:** For role selection during signup, you'll need to create a custom signup flow or use Clerk's `afterSignUpUrl` to redirect to a role selection page.

### 2.7 Update Forgot/Reset Password Pages

**Updated `client/src/app/(auth)/forgot-password/page.tsx`:**

```typescript
'use client';

import { SignIn } from '@clerk/nextjs';

const ForgotPasswordPage = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <SignIn
        routing="path"
        path="/signin"
        initialValues={{ strategy: 'reset_password_email_code' }}
      />
    </div>
  );
};

export default ForgotPasswordPage;
```

### 2.8 Update Navbar

**Updated `client/src/components/shared/Navbar.tsx`:**

```typescript
// Replace these imports:
// import { signOut } from 'aws-amplify/auth';

// With:
import { useClerk } from '@clerk/nextjs';

// In the component:
const { signOut } = useClerk();

const handleSignOut = async () => {
  await signOut();
  window.location.href = '/';
};
```

### 2.9 Update API State (Token Fetching)

**Updated `client/src/state/api.ts`:**

```typescript
// Replace these imports:
// import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

// With:
// Token is now fetched via Clerk's useAuth hook in components
// For RTK Query, we need to handle it differently

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// We'll use a custom base query that gets token from window
export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      // Token is set by ClerkProvider automatically via cookies
      // For API requests, we need to get it from Clerk
      try {
        // This will be available when using useAuth().getToken() in components
        // For the base query, we rely on cookies being set
        const token = (window as any).__clerk_token;
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } catch {
        // Continue without auth header for public endpoints
      }
      return headers;
    },
  }),
  // ... rest of the configuration
});
```

**Better approach - Create a custom hook wrapper:**

```typescript
// client/src/hooks/useApiToken.ts
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export const useApiToken = () => {
  const { getToken } = useAuth();

  useEffect(() => {
    const setToken = async () => {
      const token = await getToken();
      if (token) {
        (window as any).__clerk_token = token;
      }
    };
    setToken();
  }, [getToken]);
};
```

### 2.10 Update getAuthUser Query

**Updated endpoint in `client/src/state/api.ts`:**

```typescript
getAuthUser: build.query<User, void>({
  queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
    try {
      // Get token from window (set by useApiToken hook)
      const token = (window as any).__clerk_token;

      if (!token) {
        return { error: 'Not authenticated' };
      }

      // Decode JWT to get user info (Clerk tokens are JWTs)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;
      const userRole = payload.metadata?.role || payload.public_metadata?.role || 'tenant';

      const normalizedRole = userRole.toLowerCase();
      const endpoint =
        normalizedRole === 'manager'
          ? `/managers/${userId}`
          : `/tenants/${userId}`;

      let userDetailsResponse = await fetchWithBQ(endpoint);

      if (
        userDetailsResponse.error &&
        (userDetailsResponse.error as any).status === 404
      ) {
        // User creation should happen via webhook, but fallback here
        userDetailsResponse = await createNewUserInDatabase(
          { userId, username: payload.name || 'User' },
          { payload: { email: payload.email } },
          userRole,
          fetchWithBQ
        );
      } else if (userDetailsResponse.error) {
        return { error: 'Failed to fetch user' };
      }

      return {
        data: {
          cognitoInfo: { userId },
          userInfo: userDetailsResponse.data as Tenant | Manager,
          userRole,
        },
      };
    } catch (error: any) {
      return { error: error.message || 'Could not fetch user data' };
    }
  },
}),
```

---

## Step 3: Server-Side Migration

### 3.1 Install Clerk SDK

```bash
cd server
npm install @clerk/express
```

### 3.2 Update Auth Middleware

**Updated `server/src/app/middleware/auth.ts`:**

```typescript
import { clerkClient, requireAuth, getAuth } from '@clerk/express';
import { NextFunction, Request, Response } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

// Middleware to verify Clerk JWT and extract user info
export const auth = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const token = authHeader.split(' ')[1];

      // Verify the token with Clerk
      const { sub: userId } = await clerkClient.verifyToken(token);

      if (!userId) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }

      // Get user details to check role
      const user = await clerkClient.users.getUser(userId);
      const userRole = (user.publicMetadata?.role as string) || 'tenant';

      req.user = {
        id: userId,
        role: userRole,
      };

      const hasAccess = allowedRoles.includes(userRole.toLowerCase());

      if (!hasAccess) {
        res.status(403).json({ message: 'Access Denied' });
        return;
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  };
};

// Alternative: Use Clerk's built-in requireAuth middleware
export const clerkAuth = requireAuth();
```

### 3.3 Add Webhook Handler for User Creation

**Create `server/src/app/v1/modules/webhook/webhook.routes.ts`:**

```typescript
import express from 'express';
import { Webhook } from 'svix';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: 'Missing svix headers' });
    return;
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(req.body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    res.status(400).json({ error: 'Verification failed' });
    return;
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, username, first_name, public_metadata } = evt.data;
    const role = (public_metadata?.role as string) || 'tenant';
    const email = email_addresses?.[0]?.email_address || '';
    const name = username || first_name || 'User';

    try {
      if (role.toLowerCase() === 'manager') {
        await prisma.manager.create({
          data: {
            cognitoId: id, // Using same field name
            name,
            email,
            phoneNumber: '',
          },
        });
      } else {
        await prisma.tenant.create({
          data: {
            cognitoId: id,
            name,
            email,
            phoneNumber: '',
          },
        });
      }
      console.log(`User ${id} created as ${role}`);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }

  res.status(200).json({ received: true });
});

export const WebhookRoutes = router;
```

### 3.4 Update Server Dependencies

**Updated `server/package.json`:**

```json
{
  "dependencies": {
    "@clerk/express": "^1.0.0",
    "svix": "^1.15.0"
    // ... rest of dependencies
  }
}
```

---

## Step 4: Database Considerations

### Option A: Keep `cognitoId` Field (Recommended)

No schema changes needed. The `cognitoId` field will store Clerk's user ID instead.

### Option B: Rename to `clerkId` (Cleaner, but requires migration)

If you prefer clarity:

```prisma
model Manager {
  id       Int    @id @default(autoincrement())
  clerkId  String @unique  // Renamed from cognitoId
  // ...
}

model Tenant {
  id       Int    @id @default(autoincrement())
  clerkId  String @unique  // Renamed from cognitoId
  // ...
}
```

Then run:

```bash
npx prisma migrate dev --name rename-cognito-to-clerk
```

---

## Step 5: Testing

### 5.1 Test Checklist

- [ ] Sign up creates user in Clerk and database
- [ ] Sign in works with correct credentials
- [ ] JWT token is sent with API requests
- [ ] Protected routes redirect to signin
- [ ] Role-based access works (manager vs tenant)
- [ ] Sign out clears session
- [ ] Forgot password flow works
- [ ] User profile updates sync

### 5.2 Test Commands

```bash
# Client
cd client
npm run dev

# Server
cd server
npm run dev
```

---

## Step 6: Cleanup

After migration is verified:

1. **Remove Amplify packages:**

   ```bash
   cd client
   npm uninstall @aws-amplify/ui-react aws-amplify
   ```

2. **Remove old environment variables:**
   - `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`
   - `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`

3. **Update documentation:**
   - Update `ARCHITECTURE.md` to reflect Clerk
   - Update any deployment guides

4. **Delete AWS Cognito resources** (optional, after testing period)

---

## Troubleshooting

### Common Issues

**1. "Unauthorized" errors after sign-in**

- Ensure `CLERK_SECRET_KEY` is set on server
- Check that token is being sent in Authorization header

**2. User not created in database**

- Verify webhook endpoint is accessible
- Check webhook secret matches
- Look at server logs for errors

**3. Role not being set correctly**

- Ensure `publicMetadata.role` is set during signup
- Check that role is being read correctly in middleware

**4. CORS errors**

- Clerk handles CORS automatically, but verify server CORS config

### Debug Tips

```typescript
// In middleware, log token info:
console.log('Token payload:', await clerkClient.verifyToken(token));

// In client, log user info:
console.log('Clerk user:', user, user?.publicMetadata);
```

---

## Custom Role Selection During Signup

Since Clerk's default SignUp doesn't support custom fields, here's how to add role selection:

### Option 1: Post-signup Role Selection Page

Create `/select-role` page:

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SelectRolePage() {
  const { user } = useUser();
  const router = useRouter();
  const [role, setRole] = useState<'tenant' | 'manager'>('tenant');

  const handleSubmit = async () => {
    await user?.update({
      publicMetadata: { role },
    });
    router.push('/');
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-4">
        <h1>Select your role</h1>
        <select value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="tenant">Tenant</option>
          <option value="manager">Manager</option>
        </select>
        <button onClick={handleSubmit}>Continue</button>
      </div>
    </div>
  );
}
```

Set `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/select-role`.

### Option 2: Custom Signup Form

Build a completely custom signup form using Clerk's `useSignUp` hook.

---

## Summary

This migration replaces AWS Cognito/Amplify with Clerk while maintaining the same authentication flow and database structure. The key changes are:

1. **Client:** Replace Amplify components with Clerk components
2. **Server:** Replace JWT decode with Clerk verification
3. **Webhooks:** Use Clerk webhooks for user creation (instead of Hub events)
4. **Database:** Keep same structure, just store Clerk IDs instead of Cognito IDs

The migration is designed to be incremental and testable at each step.

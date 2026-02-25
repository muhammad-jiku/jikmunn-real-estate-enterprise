'use client';

import {
  Authenticator,
  Heading,
  Radio,
  RadioGroupField,
  useAuthenticator,
  View,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID!,
    },
  },
});

// Function to create user in database after successful sign-in
async function createUserInDatabaseAfterAuth() {
  try {
    const session = await fetchAuthSession();
    const { idToken } = session.tokens ?? {};
    const user = await getCurrentUser();
    const userRole = idToken?.payload['custom:role'] as string;

    if (!userRole) {
      console.error('[Auth] No userRole found in token');
      return;
    }

    // Convert idToken to string for Authorization header
    const tokenString = idToken?.toString();

    const normalizedRole = userRole.toLowerCase();
    const checkEndpoint =
      normalizedRole === 'manager' ? `/managers/${user.userId}` : `/tenants/${user.userId}`;

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    console.log('[Auth] Checking if user exists:', {
      baseUrl,
      checkEndpoint,
      cognitoId: user.userId,
      userRole: normalizedRole,
    });

    // First check if user already exists
    const checkResponse = await fetch(`${baseUrl}${checkEndpoint}`, {
      headers: {
        Authorization: `Bearer ${tokenString}`,
      },
    });

    console.log('[Auth] Check response status:', checkResponse.status);

    if (checkResponse.status === 404) {
      // User doesn't exist, create them
      const createEndpoint = normalizedRole === 'manager' ? '/managers' : '/tenants';

      console.log('[Auth] Creating new user in database:', {
        cognitoId: user.userId,
        role: normalizedRole,
        endpoint: `${baseUrl}${createEndpoint}`,
      });

      const createResponse = await fetch(`${baseUrl}${createEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenString}`,
        },
        body: JSON.stringify({
          cognitoId: user.userId,
          name: user.username,
          email: idToken?.payload?.email || '',
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

const components = {
  Header() {
    return (
      <View className="mt-4 mb-7">
        <Heading level={3} className="text-2xl font-bold">
          RENT
          <span className="text-secondary-500 font-light hover:text-primary-300">IFUL</span>
        </Heading>
        <p className="text-muted-foreground mt-2">
          <span className="font-bold">Welcome!</span> Please sign in to continue
        </p>
      </View>
    );
  },
  SignIn: {
    Footer() {
      const { toSignUp, toForgotPassword } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground mb-2">
            <button
              onClick={toForgotPassword}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Forgot your password?
            </button>
          </p>
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button
              onClick={toSignUp}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Sign up here
            </button>
          </p>
        </View>
      );
    },
  },
  ForgotPassword: {
    Header() {
      return (
        <View className="mt-4 mb-4">
          <Heading level={3} className="text-2xl font-bold">
            Reset Password
          </Heading>
          <p className="text-muted-foreground mt-2">
            Enter your email address and we&apos;ll send you a code to reset your password.
          </p>
        </View>
      );
    },
    Footer() {
      const { toSignIn } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Remember your password?{' '}
            <button
              onClick={toSignIn}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Back to sign in
            </button>
          </p>
        </View>
      );
    },
  },
  ConfirmResetPassword: {
    Header() {
      return (
        <View className="mt-4 mb-4">
          <Heading level={3} className="text-2xl font-bold">
            Set New Password
          </Heading>
          <p className="text-muted-foreground mt-2">
            Enter the verification code sent to your email and create a new password.
          </p>
        </View>
      );
    },
  },
  SignUp: {
    FormFields() {
      const { validationErrors } = useAuthenticator();

      return (
        <>
          <Authenticator.SignUp.FormFields />
          <RadioGroupField
            legend="Role"
            name="custom:role"
            errorMessage={validationErrors?.['custom:role']}
            hasError={!!validationErrors?.['custom:role']}
            isRequired
          >
            <Radio value="tenant">Tenant</Radio>
            <Radio value="manager">Manager</Radio>
          </RadioGroupField>
        </>
      );
    },

    Footer() {
      const { toSignIn } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={toSignIn}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Sign in
            </button>
          </p>
        </View>
      );
    },
  },
};

const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your email',
      label: 'Email',
      isRequired: true,
    },
    password: {
      placeholder: 'Enter your password',
      label: 'Password',
      isRequired: true,
    },
  },
  signUp: {
    username: {
      order: 1,
      placeholder: 'Choose a username',
      label: 'Username',
      isRequired: true,
    },
    email: {
      order: 2,
      placeholder: 'Enter your email address',
      label: 'Email',
      isRequired: true,
    },
    password: {
      order: 3,
      placeholder: 'Create a password',
      label: 'Password',
      isRequired: true,
    },
    confirm_password: {
      order: 4,
      placeholder: 'Confirm your password',
      label: 'Confirm Password',
      isRequired: true,
    },
  },
  forgotPassword: {
    username: {
      placeholder: 'Enter your email address',
      label: 'Email',
      isRequired: true,
    },
  },
  confirmResetPassword: {
    confirmation_code: {
      placeholder: 'Enter the verification code',
      label: 'Verification Code',
      isRequired: true,
    },
    password: {
      placeholder: 'Enter your new password',
      label: 'New Password',
      isRequired: true,
    },
    confirm_password: {
      placeholder: 'Confirm your new password',
      label: 'Confirm New Password',
      isRequired: true,
    },
  },
};

const Auth = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const pathname = usePathname();
  const hasCreatedUser = useRef(false);

  const isAuthPage = pathname.match(/^\/(signin|signup|forgot-password|reset-password)$/);
  const isDashboardPage = pathname.startsWith('/manager') || pathname.startsWith('/tenants');

  // Listen for auth events and create user in database after sign-in
  useEffect(() => {
    const hubListener = Hub.listen('auth', async ({ payload }) => {
      console.log('[Auth Hub] Event:', payload.event);

      if (payload.event === 'signedIn' && !hasCreatedUser.current) {
        hasCreatedUser.current = true;
        console.log('[Auth Hub] User signed in, creating in database...');
        await createUserInDatabaseAfterAuth();
      }
    });

    return () => hubListener();
  }, []);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, isAuthPage, router]);

  // Allow access to public pages without authentication
  if (!isAuthPage && !isDashboardPage) {
    return <>{children}</>;
  }

  // Determine initial state based on current path
  const getInitialState = () => {
    if (pathname.includes('signup')) return 'signUp';
    if (pathname.includes('forgot-password') || pathname.includes('reset-password'))
      return 'forgotPassword';
    return 'signIn';
  };

  return (
    <div className="h-full">
      <Authenticator
        initialState={getInitialState()}
        components={components}
        formFields={formFields}
      >
        {() => <>{children}</>}
      </Authenticator>
    </div>
  );
};

export default Auth;

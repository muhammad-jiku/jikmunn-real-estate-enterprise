'use client';

import { SignUp } from '@clerk/nextjs';

const SignUpPage = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl rounded-xl',
            headerTitle: 'text-2xl font-bold text-primary-700',
            headerSubtitle: 'text-muted-foreground',
            formButtonPrimary: 'bg-primary-700 hover:bg-primary-800 text-white font-medium',
            formFieldInput: 'border-primary-200 focus:border-primary-500 focus:ring-primary-500',
            footerActionLink: 'text-primary-600 hover:text-primary-700',
          },
        }}
        routing="hash"
        signInUrl="/signin"
        forceRedirectUrl="/select-role"
      />
    </div>
  );
};

export default SignUpPage;

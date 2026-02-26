'use client';

import { SignIn } from '@clerk/nextjs';

const ForgotPasswordPage = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <SignIn
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
        signUpUrl="/signup"
        forceRedirectUrl="/"
      />
    </div>
  );
};

export default ForgotPasswordPage;

'use client';

import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { Building2, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SelectRolePage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'tenant' | 'manager' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRole || !user) return;

    setIsSubmitting(true);
    try {
      // Note: Using unsafeMetadata as publicMetadata can only be set from backend
      // The role is also stored in DB via webhook, so this is for client-side convenience
      await user.update({
        unsafeMetadata: { role: selectedRole },
      });
      router.push('/');
    } catch (error) {
      console.error('Error updating role:', error);
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-primary-700">Loading...</div>
      </div>
    );
  }

  // If user already has a role, redirect to home
  if (user?.unsafeMetadata?.role) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary-700">
            RENT
            <span className="font-light text-secondary-500">IFUL</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Select your role to continue</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setSelectedRole('tenant')}
            className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 transition-all ${
              selectedRole === 'tenant'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`rounded-full p-3 ${
                selectedRole === 'tenant' ? 'bg-primary-600 text-white' : 'bg-gray-100'
              }`}
            >
              <Home className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-primary-700">Tenant</p>
              <p className="text-sm text-muted-foreground">Find and rent your perfect home</p>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('manager')}
            className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 transition-all ${
              selectedRole === 'manager'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`rounded-full p-3 ${
                selectedRole === 'manager' ? 'bg-primary-600 text-white' : 'bg-gray-100'
              }`}
            >
              <Building2 className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-primary-700">Property Manager</p>
              <p className="text-sm text-muted-foreground">List and manage your properties</p>
            </div>
          </button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedRole || isSubmitting}
          className="mt-6 w-full bg-primary-700 hover:bg-primary-800"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default SelectRolePage;

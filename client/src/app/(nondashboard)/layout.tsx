'use client';

import Loading from '@/components/shared/Loading';
import Navbar from '@/components/shared/Navbar';
import { NAVBAR_HEIGHT } from '@/lib/constants';
import { useGetAuthUserQuery } from '@/state/api';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  useEffect(() => {
    if (authUser) {
      const userRole = authUser.userRole?.toLowerCase();
      if (
        (userRole === 'manager' && pathname.startsWith('/search')) ||
        (userRole === 'manager' && pathname === '/')
      ) {
        setIsRedirecting(true);
        router.push('/managers/properties', { scroll: false });
      }
    }
  }, [authUser, router, pathname]);

  // Show loading only while auth is loading or redirecting
  if (authLoading || isRedirecting) return <Loading />;

  return (
    <div className='h-full w-full'>
      <Navbar />
      <main
        className={`h-full flex w-full flex-col`}
        style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;

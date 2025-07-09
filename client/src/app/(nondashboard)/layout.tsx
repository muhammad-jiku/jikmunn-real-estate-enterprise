'use client';

import Navbar from '@/components/shared/Navbar';
import { NAVBAR_HEIGHT } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pathname.startsWith('/search') || pathname === '/') {
      router.push('/managers/properties', { scroll: false });
    } else {
      setIsLoading(false);
    }
  }, [router, pathname]);

  if (isLoading) return <>Loading...</>;

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

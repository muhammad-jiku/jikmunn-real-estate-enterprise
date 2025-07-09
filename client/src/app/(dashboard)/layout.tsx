'use client';

import Sidebar from '@/components/shared/AppSidebar';
import Navbar from '@/components/shared/Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { NAVBAR_HEIGHT } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pathname.startsWith('/tenants') || pathname.startsWith('/managers')) {
      router.push('/tenants/favorites', { scroll: false });
    } else {
      setIsLoading(false);
    }
  }, [router, pathname]);

  if (isLoading) return <>Loading...</>;

  return (
    <SidebarProvider>
      <div className='min-h-screen w-full bg-primary-100'>
        <Navbar />
        <div style={{ marginTop: `${NAVBAR_HEIGHT}px` }}>
          <main className='flex'>
            <Sidebar userType={'manager'} />
            <div className='flex-grow transition-all duration-300'>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

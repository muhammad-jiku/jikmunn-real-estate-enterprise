'use client';

import { Building2, Home, Key, MapPin } from 'lucide-react';

const Loading = () => {
  return (
    <div className='fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 z-50'>
      <div className='flex flex-col items-center'>
        {/* Animated Logo House */}
        <div className='relative mb-8'>
          {/* Orbiting icons */}
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='animate-orbit'>
              <Key className='w-5 h-5 text-secondary-500' />
            </div>
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='animate-orbit-delayed'>
              <MapPin className='w-5 h-5 text-primary-500' />
            </div>
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='animate-orbit-reverse'>
              <Building2 className='w-5 h-5 text-secondary-400' />
            </div>
          </div>
          
          {/* Central house icon with pulse */}
          <div className='relative'>
            <div className='absolute inset-0 animate-ping-slow bg-primary-200 rounded-full opacity-40' style={{ width: '80px', height: '80px', marginLeft: '-8px', marginTop: '-8px' }} />
            <div className='w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-lg'>
              <Home className='w-8 h-8 text-white animate-bounce-subtle' />
            </div>
          </div>
        </div>
        
        {/* Loading text with gradient */}
        <div className='flex flex-col items-center gap-3'>
          <h2 className='text-2xl font-bold bg-gradient-to-r from-primary-700 via-secondary-600 to-primary-700 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient'>
            RENTIFUL
          </h2>
          
          {/* Animated dots */}
          <div className='flex items-center gap-1'>
            <span className='text-sm text-gray-500'>Loading</span>
            <span className='flex gap-1'>
              <span className='w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce-dot' style={{ animationDelay: '0ms' }} />
              <span className='w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce-dot' style={{ animationDelay: '150ms' }} />
              <span className='w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce-dot' style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className='mt-6 w-48 h-1 bg-gray-200 rounded-full overflow-hidden'>
          <div className='h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-full animate-progress' />
        </div>
      </div>
    </div>
  );
};

export default Loading;

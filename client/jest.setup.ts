import '@testing-library/jest-dom';
import React from 'react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: function MockImage(props: any) {
     
    return React.createElement('img', { ...props, src: props.src as string });
  },
}));

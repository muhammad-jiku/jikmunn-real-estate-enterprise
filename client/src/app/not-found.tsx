import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-background text-foreground'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-primary'>404</h1>
        <h2 className='mt-4 text-2xl font-semibold'>Page Not Found</h2>
        <p className='mt-2 text-muted-foreground'>
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link
          href='/'
          className='mt-6 inline-block rounded-md bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90'
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

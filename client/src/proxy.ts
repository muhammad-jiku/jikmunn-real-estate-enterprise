import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that don't require authentication
const _isPublicRoute = createRouteMatcher([
  '/',
  '/search(.*)',
  '/signin(.*)',
  '/signup(.*)',
  '/forgot-password(.*)',
  '/reset-password(.*)',
  '/select-role(.*)',
  '/properties/(.*)',
  '/api/webhooks(.*)',
  // Clerk internal routes
  '/sso-callback(.*)',
  '/verify(.*)',
]);

// Dashboard routes that require authentication
const isDashboardRoute = createRouteMatcher(['/managers(.*)', '/tenants(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard routes - require authentication
  if (isDashboardRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

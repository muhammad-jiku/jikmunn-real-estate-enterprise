'use client';

import { ArrowLeft, Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <div className="relative">
          <h1 className="text-[180px] md:text-[220px] font-bold text-primary-200 select-none leading-none">
            404
          </h1>
          {/* <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl border border-primary-100">
              <Home className="w-16 h-16 text-primary-600 mx-auto mb-3" />
              <p className="text-lg text-primary-700 font-medium">Page Not Found</p>
            </div>
          </div> */}
        </div>

        {/* Message */}
        <div className="mt-8 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Oops! This page doesn&apos;t exist
          </h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            The page you&apos;re looking for may have been moved, deleted, or never existed in the
            first place.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 transition-colors shadow-lg shadow-primary-700/25"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-700 font-medium rounded-lg border-2 border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Search className="w-5 h-5" />
            Search Properties
          </Link>
        </div>

        {/* Go Back Link */}
        <button
          onClick={() => typeof window !== 'undefined' && window.history.back()}
          className="mt-8 inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back to previous page
        </button>

        {/* Decorative Elements */}
        <div className="mt-16 flex justify-center gap-2">
          <div
            className="w-2 h-2 rounded-full bg-primary-300 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

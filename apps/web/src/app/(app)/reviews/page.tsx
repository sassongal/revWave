'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReviewInbox from '@/components/ReviewInbox';

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (connected === 'true') {
      setShowSuccess(true);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [connected]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <h3 className="font-medium text-green-900">
                Google Business Profile Connected!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your integration is now active. We'll start syncing your reviews shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      <ReviewInbox />
    </div>
  );
}

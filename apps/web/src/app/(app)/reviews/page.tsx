'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReviewInbox from '@/components/ReviewInbox';
import { getIntegrations, connectGoogleBusiness } from '@/lib/api';

interface IntegrationStatus {
  google_business: {
    connected: boolean;
  };
}

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const [showSuccess, setShowSuccess] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
    if (connected === 'true') {
      setShowSuccess(true);
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [connected]);

  async function loadIntegrationStatus() {
    try {
      setIntegrationLoading(true);
      const data = await getIntegrations();
      setIntegrationStatus(data);
    } catch (error: any) {
      console.error('Failed to load integration status:', error);
    } finally {
      setIntegrationLoading(false);
    }
  }

  function handleConnectGoogle() {
    connectGoogleBusiness();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <div className="flex items-center gap-3">
          {!integrationLoading && !integrationStatus?.google_business?.connected && (
            <button
              onClick={handleConnectGoogle}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect Google Business
            </button>
          )}
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

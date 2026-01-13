'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';

export default function UnsubscribePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already processed (from API redirect)
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (successParam === 'true') {
      setSuccess(true);
      setLoading(false);
      return;
    }

    if (errorParam) {
      if (errorParam === 'invalid') {
        setError('Invalid unsubscribe link. This link may have expired or is invalid.');
      } else {
        setError('An error occurred while processing your unsubscribe request.');
      }
      setLoading(false);
      return;
    }

    // If no query params, redirect to API endpoint which will process and redirect back
    // This handles the case where user directly visits the page
    if (token) {
      window.location.href = `${API_URL}/unsubscribe/${token}`;
    }
  }, [token, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing...
          </h2>
          <p className="text-gray-600">Please wait while we process your unsubscribe request.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Unsubscribe Failed
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              If you continue to receive emails, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Successfully Unsubscribed
            </h2>
            <p className="text-gray-600 mb-4">
              You have been successfully unsubscribed from our email campaigns.
            </p>
            <p className="text-sm text-gray-500">
              You will no longer receive marketing emails from us. This may take a few minutes to take effect.
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If you have any questions or concerns, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

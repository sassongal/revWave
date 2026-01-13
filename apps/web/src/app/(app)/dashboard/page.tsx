'use client';

import { useEffect, useState } from 'react';
import { getMe, getAnalyticsSummary, getIntegrations, connectGoogleBusiness } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone?: string;
}

interface AuthData {
  user: User;
  tenant: Tenant;
  role: string;
}

interface AnalyticsSummary {
  success: boolean;
  tapsThisMonth: number;
  newReviews7d: number;
  avgRating: number;
  topTags: Array<{
    tagId: string;
    name: string | null;
    publicCode: string;
    tapCount: number;
  }>;
}

interface IntegrationStatus {
  google_business: {
    connected: boolean;
    integration?: {
      id: string;
      status: string;
      lastSyncAt?: string;
    };
  };
}

export default function DashboardPage() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    loadAnalytics();
    loadIntegrationStatus();

    // Check if we just connected
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setSuccessMessage('Google Business Profile connected successfully! Click "Sync Now" to sync your reviews.');
      // Clear the URL parameter
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  async function loadUserData() {
    try {
      const data = await getMe();
      setAuthData(data);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await getAnalyticsSummary();
      setAnalytics(data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      setAnalyticsError(error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }

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

  async function handleSyncNow() {
    try {
      setSyncing(true);
      setSuccessMessage(null); // Clear any existing messages
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/sync/google/run`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setSuccessMessage('✓ Sync started successfully! Your reviews are being imported. This may take 1-2 minutes...');
        // Reload integration status after a delay
        setTimeout(() => {
          loadIntegrationStatus();
          loadAnalytics();
          setSuccessMessage('✓ Sync completed! Check the Reviews page to see your imported reviews.');
        }, 5000);
      } else {
        const data = await response.json();
        const errorMessage = data.message || 'Unknown error';

        if (errorMessage.includes('rate limit') || errorMessage.includes('Too Many Requests')) {
          setSuccessMessage('⚠️ Google rate limit reached. Please wait 2-3 minutes and try again. This is normal when syncing frequently.');
        } else {
          setSuccessMessage(`❌ Sync failed: ${errorMessage}`);
        }
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSuccessMessage(`❌ Sync failed: ${error.message || 'Network error'}`);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authData) {
    return <div>Failed to load user data</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {authData.user.name}!
        </p>
      </div>

      {successMessage && (
        <div className={`rounded-md p-4 ${
          successMessage.startsWith('✓')
            ? 'bg-green-50 border border-green-200'
            : successMessage.startsWith('⚠️')
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 mt-0.5 ${
              successMessage.startsWith('✓')
                ? 'text-green-600'
                : successMessage.startsWith('⚠️')
                ? 'text-yellow-600'
                : 'text-red-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {successMessage.startsWith('✓') ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : successMessage.startsWith('⚠️') ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                successMessage.startsWith('✓')
                  ? 'text-green-900'
                  : successMessage.startsWith('⚠️')
                  ? 'text-yellow-900'
                  : 'text-red-900'
              }`}>{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className={`${
                successMessage.startsWith('✓')
                  ? 'text-green-600 hover:text-green-800'
                  : successMessage.startsWith('⚠️')
                  ? 'text-yellow-600 hover:text-yellow-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            User Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {authData.user.avatar && (
                <img
                  src={authData.user.avatar}
                  alt={authData.user.name}
                  className="h-16 w-16 rounded-full"
                />
              )}
              <div>
                <div className="font-medium text-gray-900">
                  {authData.user.name}
                </div>
                <div className="text-sm text-gray-500">
                  {authData.user.email}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="text-sm text-gray-500">User ID</div>
              <div className="font-mono text-xs text-gray-700">
                {authData.user.id}
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Workspace
          </h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Workspace Name</div>
              <div className="font-medium text-gray-900">
                {authData.tenant.name}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Slug</div>
              <div className="font-mono text-sm text-gray-700">
                {authData.tenant.slug}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Your Role</div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {authData.role}
              </div>
            </div>
            {authData.tenant.timezone && (
              <div>
                <div className="text-sm text-gray-500">Timezone</div>
                <div className="text-sm text-gray-700">
                  {authData.tenant.timezone}
                </div>
              </div>
            )}
            <div className="pt-3 border-t">
              <div className="text-sm text-gray-500">Tenant ID</div>
              <div className="font-mono text-xs text-gray-700">
                {authData.tenant.id}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Taps This Month */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Taps This Month</div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </div>
          {analyticsLoading ? (
            <div className="mt-2 text-3xl font-bold text-gray-400">...</div>
          ) : analyticsError ? (
            <div className="mt-2 text-sm text-red-600">Error loading</div>
          ) : (
            <>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {analytics?.tapsThisMonth ?? 0}
              </div>
              <div className="mt-1 text-sm text-gray-600">NFC/QR taps</div>
            </>
          )}
        </div>

        {/* New Reviews (7d) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">New Reviews (7d)</div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          {analyticsLoading ? (
            <div className="mt-2 text-3xl font-bold text-gray-400">...</div>
          ) : analyticsError ? (
            <div className="mt-2 text-sm text-red-600">Error loading</div>
          ) : (
            <>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {analytics?.newReviews7d ?? 0}
              </div>
              <div className="mt-1 text-sm text-gray-600">Last 7 days</div>
            </>
          )}
        </div>

        {/* Avg Rating (30d) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Avg Rating (30d)</div>
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          {analyticsLoading ? (
            <div className="mt-2 text-3xl font-bold text-gray-400">...</div>
          ) : analyticsError ? (
            <div className="mt-2 text-sm text-red-600">Error loading</div>
          ) : (
            <>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {analytics?.avgRating
                  ? analytics.avgRating.toFixed(2)
                  : '0.00'}
              </div>
              <div className="mt-1 text-sm text-gray-600">Out of 5.0</div>
            </>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Integrations
        </h2>

        {/* Google Business Profile */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                Google Business Profile
              </h3>
              <p className="text-sm text-gray-600">
                Sync reviews and manage your online reputation
              </p>
            </div>
          {!integrationLoading && (
            <div>
              {integrationStatus?.google_business?.connected ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
              ) : (
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
            </div>
          )}
          </div>
          {integrationStatus?.google_business?.connected && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start justify-between">
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Status:</strong> {integrationStatus.google_business.integration?.status || 'active'}
                  </p>
                  {integrationStatus.google_business.integration?.lastSyncAt && (
                    <p className="mt-1">
                      <strong>Last Sync:</strong>{' '}
                      {new Date(integrationStatus.google_business.integration.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Gmail for Email Sending */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                Gmail (Email Sending)
              </h3>
              <p className="text-sm text-gray-600">
                Send campaign emails from your Gmail account with OAuth security
              </p>
            </div>
            {!integrationLoading && (
              <div>
                {integrationStatus?.google_business?.connected &&
                 integrationStatus?.google_business?.integration?.status === 'connected' ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Connected
                    </span>
                    <span className="text-xs text-gray-500">(via Google OAuth)</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Connect Gmail
                  </button>
                )}
              </div>
            )}
          </div>
          {integrationStatus?.google_business?.connected && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Gmail OAuth is enabled!</p>
                  <p className="mt-1">Your campaigns will be sent from your Gmail account with better security and higher sending limits (25,000 emails/day).</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          Getting Started
        </h2>
        <p className="text-blue-700 mb-4">
          Welcome to revWave! Here are some next steps to get started:
        </p>
        <ul className="space-y-2 text-blue-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Connect your Google Business Profile (above)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Set up your first NFC/QR tag</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Import your customer contacts</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

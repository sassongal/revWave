'use client';

import { useEffect, useState } from 'react';
import { getMe } from '@/lib/api';

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

export default function DashboardPage() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Reviews</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-600">No reviews yet</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Contacts</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-600">No contacts yet</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Campaigns</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">0</div>
          <div className="mt-1 text-sm text-gray-600">No campaigns yet</div>
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
            <span>Connect your Google Business Profile</span>
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

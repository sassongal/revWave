'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign, getIntegrations, API_URL } from '@/lib/api';

interface IntegrationStatus {
  google_business: {
    connected: boolean;
    integration?: {
      id: string;
      status: string;
      scopes?: string[];
    };
  };
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    bodyHtml: '',
    sendNow: true,
    scheduledDate: '',
    scheduledTime: '',
  });

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

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

  const gmailConnected = integrationStatus?.google_business?.connected &&
    integrationStatus?.google_business?.integration?.status === 'connected';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim() || !formData.subject.trim() || !formData.bodyHtml.trim()) {
        setError('Please fill in all required fields');
        setSubmitting(false);
        return;
      }

      // Validate scheduled time if not sending now
      if (!formData.sendNow) {
        if (!formData.scheduledDate || !formData.scheduledTime) {
          setError('Please select a date and time for scheduled sending');
          setSubmitting(false);
          return;
        }
      }

      // Build scheduledAt timestamp if scheduling
      let scheduledAt: string | undefined;
      if (!formData.sendNow && formData.scheduledDate && formData.scheduledTime) {
        scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      }

      const response = await createCampaign({
        name: formData.name.trim(),
        subject: formData.subject.trim(),
        bodyHtml: formData.bodyHtml.trim(),
        scheduledAt,
      });

      if (response.success) {
        router.push(`/crm/campaigns/${response.campaign.id}`);
      } else {
        setError(response.message || 'Failed to create campaign');
      }
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Campaign</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create a new email campaign
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Gmail OAuth Banner */}
        {!integrationLoading && (
          <>
            {gmailConnected ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-green-900">
                      Gmail OAuth Connected
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your campaigns will be sent from your Gmail account with OAuth security. Enjoy higher sending limits (25,000 emails/day) and better deliverability.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-900">
                      Connect Gmail for Better Email Delivery
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Connect your Gmail account to send emails directly from your address with OAuth security and higher sending limits (25,000 emails/day vs 2,000 with SMTP).
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.href = `${API_URL}/integrations/google/connect`}
                      className="mt-3 inline-flex items-center px-3 py-1.5 border border-yellow-300 rounded-md text-sm font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
                      Connect Gmail
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Campaign Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Monthly Newsletter"
          />
        </div>

        {/* Subject */}
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            required
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your monthly update"
          />
        </div>

        {/* Segment Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipients
          </label>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-700">
              <strong>Segment:</strong> Subscribed contacts only (contacts with
              granted consent)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Contacts with revoked consent will be automatically excluded when
              sending.
            </p>
          </div>
        </div>

        {/* HTML Body */}
        <div>
          <label
            htmlFor="bodyHtml"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Body (HTML) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bodyHtml"
            required
            rows={15}
            value={formData.bodyHtml}
            onChange={(e) =>
              setFormData({ ...formData, bodyHtml: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="<html>
  <body>
    <h1>Hello!</h1>
    <p>Your email content here...</p>
  </body>
</html>"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter HTML content for your email. Unsubscribe links will be
            automatically added.
          </p>
        </div>

        {/* Scheduling Options */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Sending Options</h3>

          {/* Send Now / Schedule Radio */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={formData.sendNow}
                onChange={() => setFormData({ ...formData, sendNow: true })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Send Now</div>
                <div className="text-xs text-gray-500">
                  Create as draft - you'll manually send from campaign details
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!formData.sendNow}
                onChange={() => setFormData({ ...formData, sendNow: false })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Schedule for Later</div>
                <div className="text-xs text-gray-500">
                  Automatically send at a specific date and time
                </div>
              </div>
            </label>
          </div>

          {/* Date/Time Picker - Show when Schedule is selected */}
          {!formData.sendNow && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="scheduledDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="scheduledDate"
                    required={!formData.sendNow}
                    value={formData.scheduledDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledDate: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="scheduledTime"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="scheduledTime"
                    required={!formData.sendNow}
                    value={formData.scheduledTime}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-700">
                Campaign will be automatically sent at the scheduled time (timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone})
              </p>
            </div>
          )}
        </div>

        {/* Preview Note */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Recipients will be determined when the campaign is sent. Only contacts with granted consent will receive emails.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}

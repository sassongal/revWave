'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCampaign, sendCampaign, getCampaignReport } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface CampaignReport {
  campaign: {
    id: string;
    name: string;
    subject: string;
    status: string;
    sentAt?: string;
  };
  stats: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  recipients: Array<{
    id: string;
    contact: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    status: string;
    sentAt?: string;
    errorMessage?: string;
  }>;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  async function loadCampaign() {
    try {
      setLoading(true);
      setError(null);

      const response = await getCampaign(campaignId);
      setCampaign(response.campaign);

      // If campaign is sent or scheduled, load report
      if (
        response.campaign.status === 'sent' ||
        response.campaign.status === 'scheduled'
      ) {
        loadReport();
      }
    } catch (err: any) {
      console.error('Failed to load campaign:', err);
      setError(err.response?.data?.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    try {
      const response = await getCampaignReport(campaignId);
      setReport(response);
      setShowReport(true);
    } catch (err: any) {
      console.error('Failed to load report:', err);
    }
  }

  async function handleSend() {
    if (
      !confirm(
        'Are you sure you want to send this campaign? It will be sent to all subscribed contacts.',
      )
    ) {
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const response = await sendCampaign(campaignId);
      if (response.success) {
        // Reload campaign and report
        await loadCampaign();
        // Wait a bit for sending to start, then load report
        setTimeout(() => {
          loadReport();
        }, 1000);
      } else {
        setSendError(response.message || 'Failed to send campaign');
      }
    } catch (err: any) {
      console.error('Failed to send campaign:', err);
      setSendError(err.response?.data?.message || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRecipientStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">
                {error || 'Campaign not found'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/crm/campaigns')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/crm/campaigns')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Campaigns
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            {getStatusBadge(campaign.status)}
            <span className="text-sm text-gray-600">
              Created by {campaign.createdBy.name}
            </span>
          </div>
        </div>
        {campaign.status === 'draft' && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send Campaign
              </>
            )}
          </button>
        )}
      </div>

      {/* Send Error */}
      {sendError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{sendError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <div className="text-sm text-gray-900">{campaign.subject}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Body (HTML)
          </label>
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50 max-h-96 overflow-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
              {campaign.bodyHtml}
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created
            </label>
            <div className="text-sm text-gray-900">
              {new Date(campaign.createdAt).toLocaleString()}
            </div>
          </div>
          {campaign.sentAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sent
              </label>
              <div className="text-sm text-gray-900">
                {new Date(campaign.sentAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Section */}
      {(campaign.status === 'sent' ||
        campaign.status === 'scheduled' ||
        showReport) && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Delivery Report
            </h2>
            {!showReport && (
              <button
                onClick={loadReport}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Load Report
              </button>
            )}
          </div>

          {report ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.stats.total}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm text-yellow-600">Pending</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {report.stats.pending}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600">Sent</div>
                  <div className="text-2xl font-bold text-green-900">
                    {report.stats.sent}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-red-600">Failed</div>
                  <div className="text-2xl font-bold text-red-900">
                    {report.stats.failed}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Skipped</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.stats.skipped}
                  </div>
                </div>
              </div>

              {/* Recipients Table */}
              {report.recipients.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Recipients
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sent At
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {report.recipients.map((recipient) => (
                          <tr key={recipient.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {recipient.contact.firstName ||
                                recipient.contact.lastName
                                  ? `${recipient.contact.firstName || ''} ${
                                      recipient.contact.lastName || ''
                                    }`.trim()
                                  : '—'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {recipient.contact.email}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {getRecipientStatusBadge(recipient.status)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {recipient.sentAt
                                ? new Date(recipient.sentAt).toLocaleString()
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600">
                              {recipient.errorMessage || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Click "Load Report" to view delivery details
            </div>
          )}
        </div>
      )}
    </div>
  );
}

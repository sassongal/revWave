'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getContact, updateContact, revokeContactConsent, getContactCampaignHistory } from '@/lib/api';

interface Contact {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source: string;
  consentStatus: 'granted' | 'revoked';
  consentTimestamp: string;
  consentSource?: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignHistory {
  id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped_unsubscribed';
  sentAt?: string;
  errorMessage?: string;
  campaign: {
    id: string;
    name: string;
    subject: string;
    status: string;
    sentAt?: string;
  };
}

export default function ContactDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    loadContact();
  }, [contactId]);

  async function loadContact() {
    try {
      setLoading(true);
      setError(null);

      const [contactResponse, historyResponse] = await Promise.all([
        getContact(contactId),
        getContactCampaignHistory(contactId),
      ]);

      setContact(contactResponse.contact);
      setCampaignHistory(historyResponse.history);
    } catch (err: any) {
      console.error('Failed to load contact:', err);
      setError(err.response?.data?.message || 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await updateContact(contactId, {
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
      });

      setShowEditModal(false);
      loadContact(); // Refresh the data
    } catch (err: any) {
      console.error('Failed to update contact:', err);
      setSubmitError(err.response?.data?.message || 'Failed to update contact');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeConsent() {
    if (!confirm('Are you sure you want to revoke consent for this contact? They will no longer receive communications.')) {
      return;
    }

    try {
      await revokeContactConsent(contactId);
      loadContact(); // Refresh the data
    } catch (err: any) {
      console.error('Failed to revoke consent:', err);
      alert(err.response?.data?.message || 'Failed to revoke consent');
    }
  }

  function openEditModal() {
    if (!contact) return;
    setFormData({
      email: contact.email,
      phone: contact.phone || '',
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
    });
    setShowEditModal(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !contact) {
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
              <p className="text-sm text-red-700 mt-1">{error || 'Contact not found'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/crm/contacts')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Contacts
        </button>
      </div>
    );
  }

  const getConsentStatusColor = (status: string) => {
    return status === 'granted'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/crm/contacts')}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
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
            Back to Contacts
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              : contact.email}
          </h1>
          <p className="mt-2 text-sm text-gray-600">Contact Details</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openEditModal}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit Contact
          </button>
          {contact.consentStatus === 'granted' && (
            <button
              onClick={handleRevokeConsent}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              Revoke Consent
            </button>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-sm text-gray-900">{contact.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-sm text-gray-900">
                {contact.phone || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">First Name</label>
              <p className="mt-1 text-sm text-gray-900">
                {contact.firstName || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Last Name</label>
              <p className="mt-1 text-sm text-gray-900">
                {contact.lastName || <span className="text-gray-400 italic">Not provided</span>}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Source</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">
                {contact.source.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Created At</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(contact.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Consent Status</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span
                className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getConsentStatusColor(contact.consentStatus)}`}
              >
                {contact.consentStatus === 'granted' ? 'Subscribed' : 'Unsubscribed'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Consent Timestamp</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(contact.consentTimestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Consent Source</label>
              <p className="mt-1 text-sm text-gray-900">
                {contact.consentSource || <span className="text-gray-400 italic">Not specified</span>}
              </p>
            </div>
          </div>

          {contact.consentStatus === 'revoked' && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
              <p className="text-sm text-red-700">
                This contact has revoked consent and will not receive any communications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Campaign History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Campaign History</h2>
        </div>
        <div className="px-6 py-4">
          {campaignHistory.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No campaigns sent to this contact yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaignHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.campaign.name}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {item.campaign.subject}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.status === 'skipped_unsubscribed' ? 'Skipped' : item.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.sentAt
                          ? new Date(item.sentAt).toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/crm/campaigns/${item.campaign.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Campaign
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {campaignHistory.some(item => item.errorMessage) && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Errors:</h3>
                  {campaignHistory
                    .filter(item => item.errorMessage)
                    .map((item) => (
                      <div key={item.id} className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="text-xs text-red-700">
                          <strong>{item.campaign.name}:</strong> {item.errorMessage}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Edit Contact</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSubmitError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
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
                </button>
              </div>

              <form onSubmit={handleUpdateContact} className="space-y-4">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSubmitError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

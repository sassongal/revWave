'use client';

import { useEffect, useState } from 'react';
import { getTags, getTagStats, createTag, updateTag, deleteTag, API_URL } from '@/lib/api';
import { api } from '@/lib/api';

interface Tag {
  id: string;
  publicCode: string;
  name?: string;
  status: 'active' | 'disabled' | 'lost';
  locationId?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
  };
  _count?: {
    tapEvents: number;
  };
}

interface TagStats {
  totalTags: number;
  activeTags: number;
  disabledTags: number;
  lostTags: number;
  totalTaps: number;
}

interface Location {
  id: string;
  name: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    locationId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [tagsResponse, statsResponse, locationsResponse] = await Promise.all([
        getTags(),
        getTagStats(),
        api.get('/integrations/google/locations'),
      ]);

      setTags(tagsResponse.data);
      setStats(statsResponse.data);
      setLocations(locationsResponse.data.locations || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.response?.data?.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await createTag({
        name: formData.name.trim() || undefined,
        locationId: formData.locationId || undefined,
      });

      // Reset form and close modal
      setFormData({ name: '', locationId: '' });
      setShowAddModal(false);
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to create tag:', err);
      setSubmitError(err.response?.data?.message || 'Failed to create tag');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTag) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await updateTag(selectedTag.id, {
        name: formData.name.trim() || undefined,
        locationId: formData.locationId || undefined,
      });

      // Reset form and close modal
      setFormData({ name: '', locationId: '' });
      setShowEditModal(false);
      setSelectedTag(null);
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update tag:', err);
      setSubmitError(err.response?.data?.message || 'Failed to update tag');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus(tagId: string, status: 'active' | 'disabled' | 'lost') {
    try {
      await updateTag(tagId, { status });
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update tag status:', err);
      alert(err.response?.data?.message || 'Failed to update tag status');
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteTag(tagId);
      loadData(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to delete tag:', err);
      alert(err.response?.data?.message || 'Failed to delete tag');
    }
  }

  function openEditModal(tag: Tag) {
    setSelectedTag(tag);
    setFormData({
      name: tag.name || '',
      locationId: tag.locationId || '',
    });
    setShowEditModal(true);
  }

  function openQRModal(tag: Tag) {
    setSelectedTag(tag);
    setShowQRModal(true);
  }

  const getRedirectUrl = (publicCode: string) => {
    return `${API_URL}/redirect/t/${publicCode}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NFC Tags</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your NFC tags and track customer engagement
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Tag
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Tags</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTags}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.activeTags}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Disabled</div>
            <div className="text-2xl font-bold text-gray-600">{stats.disabledTags}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Lost</div>
            <div className="text-2xl font-bold text-red-600">{stats.lostTags}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Taps</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalTaps}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
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
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tags Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tag Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taps
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Loading tags...</p>
                </td>
              </tr>
            ) : tags.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No tags found. Create your first tag to get started.
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {tag.publicCode}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getRedirectUrl(tag.publicCode)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {tag.name || <span className="text-gray-400 italic">No name</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {tag.location?.name || <span className="text-gray-400 italic">Not assigned</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={tag.status}
                      onChange={(e) => handleUpdateStatus(tag.id, e.target.value as any)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(tag.status)}`}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {tag._count?.tapEvents || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openQRModal(tag)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      QR Code
                    </button>
                    <button
                      onClick={() => openEditModal(tag)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Tag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Create New Tag
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitError(null);
                    setFormData({ name: '', locationId: '' });
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

              <form onSubmit={handleCreateTag} className="space-y-4">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tag Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Front Desk, Table 5"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Internal name for this tag (not shown to customers)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="locationId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location (Optional)
                  </label>
                  <select
                    id="locationId"
                    value={formData.locationId}
                    onChange={(e) =>
                      setFormData({ ...formData, locationId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Associate this tag with a business location
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-700">
                    A unique public code will be automatically generated for this tag.
                    You can use this code to create NFC tags or QR codes.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSubmitError(null);
                      setFormData({ name: '', locationId: '' });
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
                    {submitting ? 'Creating...' : 'Create Tag'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {showEditModal && selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Tag
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSubmitError(null);
                    setSelectedTag(null);
                    setFormData({ name: '', locationId: '' });
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

              <form onSubmit={handleUpdateTag} className="space-y-4">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-600">Public Code</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {selectedTag.publicCode}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="edit-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tag Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Front Desk, Table 5"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-locationId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location (Optional)
                  </label>
                  <select
                    id="edit-locationId"
                    value={formData.locationId}
                    onChange={(e) =>
                      setFormData({ ...formData, locationId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSubmitError(null);
                      setSelectedTag(null);
                      setFormData({ name: '', locationId: '' });
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

      {/* QR Code Modal */}
      {showQRModal && selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  QR Code
                </h2>
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setSelectedTag(null);
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

              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getRedirectUrl(selectedTag.publicCode))}`}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-600 mb-1">Tag Code</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedTag.publicCode}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="text-xs text-gray-600 mb-1">Redirect URL</div>
                  <div className="text-sm font-mono text-gray-900 break-all">
                    {getRedirectUrl(selectedTag.publicCode)}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getRedirectUrl(selectedTag.publicCode));
                      alert('URL copied to clipboard!');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(getRedirectUrl(selectedTag.publicCode))}`;
                      link.download = `qr-${selectedTag.publicCode}.png`;
                      link.click();
                    }}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

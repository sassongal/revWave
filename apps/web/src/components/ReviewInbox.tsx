'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Review {
  id: string;
  externalId: string;
  rating: number;
  content?: string;
  reviewerName: string;
  reviewerAvatar?: string;
  publishedAt: string;
  repliedStatus: 'pending' | 'drafted' | 'replied';
  location: {
    id: string;
    name: string;
    externalId: string;
  };
  replies: Array<{
    id: string;
    content: string;
    isDraft: boolean;
    publishedAt?: string;
  }>;
}

interface PaginatedResponse {
  success: boolean;
  data: Review[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface ReviewInboxProps {
  onReviewClick?: (review: Review) => void;
}

export default function ReviewInbox({ onReviewClick }: ReviewInboxProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'pending' | 'drafted' | 'replied'>('all');
  const [locationId, setLocationId] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  useEffect(() => {
    loadReviews();
  }, [filter, pagination.page]);

  async function loadReviews() {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      };

      if (filter !== 'all') {
        params.filter = filter;
      }

      if (locationId) {
        params.locationId = locationId;
      }

      const response = await api.get<PaginatedResponse>('/reviews', { params });

      setReviews(response.data.data);
      setPagination(response.data.pagination);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  }

  function getSnippet(content?: string): string {
    if (!content) return 'No review text';
    if (content.length <= 100) return content;
    return content.substring(0, 100) + '...';
  }

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      drafted: 'bg-blue-100 text-blue-800 border-blue-200',
      replied: 'bg-green-100 text-green-800 border-green-200',
    };

    const labels = {
      pending: 'Pending',
      drafted: 'Draft',
      replied: 'Replied',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load reviews</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadReviews}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filter" className="text-sm font-medium text-gray-700">
              Filter:
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Reviews</option>
              <option value="unreplied">Unreplied</option>
              <option value="pending">Pending</option>
              <option value="drafted">Drafted</option>
              <option value="replied">Replied</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            {pagination.totalItems} {pagination.totalItems === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      {reviews.length === 0 ? (
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-600">
            {filter !== 'all'
              ? `No ${filter} reviews at the moment.`
              : 'Connect your Google Business Profile to start seeing reviews.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Review
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  onClick={() => onReviewClick?.(review)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {review.reviewerAvatar ? (
                        <img
                          src={review.reviewerAvatar}
                          alt={review.reviewerName}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {review.reviewerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900">
                        {review.reviewerName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{renderStars(review.rating)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md">{getSnippet(review.content)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{review.location.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(review.publishedAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(review.repliedStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {reviews.length > 0 && pagination.totalPages > 1 && (
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPreviousPage}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface Review {
  id: string;
  rating: number;
  content: string | null;
  reviewerName: string;
  publishedAt: string;
  replyStatus: 'pending' | 'drafted' | 'replied';
  location: {
    id: string;
    name: string;
  };
}

interface ReplyModalProps {
  review: Review;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReplyModal({ review, onClose, onSuccess }: ReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  const handleSuggestAI = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.post(`/reviews/${review.id}/draft`);

      if (response.data.success) {
        setReplyText(response.data.draftText);
        setReplyId(response.data.replyId);
        setLanguage(response.data.language);
      } else {
        setError(response.data.message || 'Failed to generate AI draft');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate AI draft');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!replyText.trim()) {
      setError('Please enter a reply or generate one with AI');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const response = await api.post(`/reviews/${review.id}/reply`);

      if (response.data.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(response.data.message || 'Failed to publish reply');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish reply');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Reply to Review
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {review.location.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
        </div>

        {/* Review Content */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`h-5 w-5 ${
                    i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {review.reviewerName}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(review.publishedAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-gray-700">
            {review.content || <em className="text-gray-400">No review text provided</em>}
          </p>
        </div>

        {/* Reply Form */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="reply-text"
                className="block text-sm font-medium text-gray-700"
              >
                Your Reply
                {language && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({language})
                  </span>
                )}
              </label>
              <button
                onClick={handleSuggestAI}
                disabled={isGenerating || isPublishing}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Suggest AI
                  </>
                )}
              </button>
            </div>
            <textarea
              id="reply-text"
              rows={6}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={isGenerating || isPublishing}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm"
              placeholder="Type your reply here or use AI to generate one..."
            />
            <p className="mt-2 text-sm text-gray-500">
              {replyText.length} / 1000 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating || isPublishing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isGenerating || isPublishing || !replyText.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Publishing...
                </>
              ) : (
                'Publish Reply'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

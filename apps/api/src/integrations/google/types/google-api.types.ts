/**
 * Type definitions for Google Business Profile API responses
 * Minimal typing - can be expanded as needed
 */

export interface GoogleLocation {
  name: string; // Resource name: "locations/{locationId}"
  title: string; // Business name
  storefrontAddress?: {
    regionCode?: string;
    languageCode?: string;
    postalCode?: string;
    administrativeArea?: string;
    locality?: string;
    addressLines?: string[];
  };
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
  metadata?: {
    mapsUri?: string;
  };
}

export interface GoogleReview {
  name: string; // Resource name: "locations/{locationId}/reviews/{reviewId}"
  reviewId: string;
  reviewer?: {
    profilePhotoUrl?: string;
    displayName?: string;
    isAnonymous?: boolean;
  };
  starRating?: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime?: string; // ISO 8601 timestamp
  updateTime?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
  };
}

export interface GoogleLocationsResponse {
  locations?: GoogleLocation[];
  nextPageToken?: string;
  totalSize?: number;
}

export interface GoogleReviewsResponse {
  reviews?: GoogleReview[];
  nextPageToken?: string;
  averageRating?: number;
  totalReviewCount?: number;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

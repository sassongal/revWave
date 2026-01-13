import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

// Auth helper functions
export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data;
}

// Analytics helper functions
export async function getAnalyticsSummary() {
  const response = await api.get('/analytics/summary');
  return response.data;
}

// Contacts helper functions
export async function getContacts(params?: {
  status?: 'subscribed' | 'unsubscribed' | 'all';
  page?: number;
  limit?: number;
}) {
  const response = await api.get('/contacts', { params });
  return response.data;
}

export async function createContact(data: {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source: 'landing_page' | 'manual' | 'import';
  consentStatus: 'granted';
  consentTimestamp: string;
  consentSource?: string;
}) {
  const response = await api.post('/contacts', data);
  return response.data;
}

export async function updateContact(id: string, data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}) {
  const response = await api.patch(`/contacts/${id}`, data);
  return response.data;
}

export async function getContact(id: string) {
  const response = await api.get(`/contacts/${id}`);
  return response.data;
}

export async function getContactCampaignHistory(id: string) {
  const response = await api.get(`/contacts/${id}/campaign-history`);
  return response.data;
}

export async function revokeContactConsent(id: string) {
  const response = await api.post(`/contacts/${id}/revoke-consent`);
  return response.data;
}

// Campaigns helper functions
export async function getCampaigns() {
  const response = await api.get('/campaigns');
  return response.data;
}

export async function getCampaign(id: string) {
  const response = await api.get(`/campaigns/${id}`);
  return response.data;
}

export async function createCampaign(data: {
  name: string;
  subject: string;
  bodyHtml: string;
  scheduledAt?: string;
}) {
  const response = await api.post('/campaigns', data);
  return response.data;
}

export async function sendCampaign(id: string, contactIds?: string[]) {
  const response = await api.post(`/campaigns/${id}/send`, {
    contactIds,
  });
  return response.data;
}

export async function getCampaignReport(id: string) {
  const response = await api.get(`/campaigns/${id}/report`);
  return response.data;
}

// Integrations helper functions
export async function getIntegrations() {
  const response = await api.get('/integrations');
  return response.data;
}

export async function connectGoogleBusiness() {
  // This will redirect to Google OAuth, so we just navigate
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  window.location.href = `${apiUrl}/integrations/google/connect`;
}

export async function disconnectGoogleBusiness() {
  const response = await api.post('/integrations/google/disconnect');
  return response.data;
}

// Tags helper functions
export async function getTags() {
  const response = await api.get('/tags');
  return response.data;
}

export async function getTag(id: string) {
  const response = await api.get(`/tags/${id}`);
  return response.data;
}

export async function getTagStats() {
  const response = await api.get('/tags/stats');
  return response.data;
}

export async function createTag(data: {
  name?: string;
  locationId?: string;
}) {
  const response = await api.post('/tags', data);
  return response.data;
}

export async function updateTag(id: string, data: {
  name?: string;
  locationId?: string;
  status?: 'active' | 'disabled' | 'lost';
}) {
  const response = await api.patch(`/tags/${id}`, data);
  return response.data;
}

export async function deleteTag(id: string) {
  const response = await api.delete(`/tags/${id}`);
  return response.data;
}

// Reviews helper functions
export async function getReviews(params?: {
  status?: string;
  rating?: number;
  locationId?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get('/reviews', { params });
  return response.data;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

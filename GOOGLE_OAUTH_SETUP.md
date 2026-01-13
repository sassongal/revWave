# Google OAuth Setup Guide

## Problem
Getting "Bad Request" or 500 errors when trying to connect Google Business Profile.

## Solution

### Step 1: Configure Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Click on it to edit

### Step 2: Add Authorized Redirect URIs

In the "Authorized redirect URIs" section, make sure you have these URIs:

**For local development:**
- `http://localhost:3001/auth/google/callback`
- `http://localhost:3001/integrations/google/callback`

**For production (when you deploy):**
- `https://yourdomain.com/auth/google/callback`
- `https://yourdomain.com/integrations/google/callback`

### Step 3: Save Changes

Click "Save" at the bottom of the page.

### Step 4: Test the Flow

1. Go to http://localhost:3000/login
2. Click "Sign in with Google"
3. Complete the Google OAuth flow
4. You should be redirected to the dashboard
5. Now try clicking "Connect Google Business"

## Common Issues

### Issue: "redirect_uri_mismatch"
- **Cause**: The redirect URI in the request doesn't match what's configured in Google Console
- **Fix**: Add the exact URI to the "Authorized redirect URIs" list in Google Console

### Issue: "Bad Request"
- **Cause**: Usually means the OAuth credentials are invalid or redirect URI is wrong
- **Fix**: Double-check the Client ID and Client Secret in `.env` file

### Issue: "Unique constraint failed on session_id"
- **Cause**: Trying to create a session that already exists
- **Fix**: This has been fixed in the code (using upsert instead of create)

## Environment Variables

Make sure your `.env` file has:

```
# Google OAuth (Auth)
GOOGLE_AUTH_CLIENT_ID=your-google-auth-client-id.apps.googleusercontent.com
GOOGLE_AUTH_CLIENT_SECRET=your-google-auth-client-secret

# Google Business (uses same client for now)
GOOGLE_BUSINESS_CLIENT_ID=your-google-business-client-id.apps.googleusercontent.com
GOOGLE_BUSINESS_CLIENT_SECRET=your-google-business-client-secret

# API URL
API_URL=http://localhost:3001
```

## Required OAuth Scopes

The Google Business Profile integration requires these scopes:
- `email`
- `profile`
- `https://www.googleapis.com/auth/business.manage`

Make sure your OAuth consent screen is configured to request these scopes.

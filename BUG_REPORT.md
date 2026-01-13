# 🐛 Bug Report: Google Business Profile OAuth - 500 Internal Server Error

## 🔍 Problem Description

When trying to connect Google Business Profile via `/integrations/google/connect`, the API returns:
```json
{"statusCode":500,"message":"Internal server error"}
```

## 📋 Error Details from Logs

### Error 1: TokenError - Bad Request
```
[Nest] 49121  - 01/12/2026, 7:27:13 PM   ERROR [ExceptionsHandler] Bad Request
TokenError: Bad Request
    at OAuth2Strategy.parseErrorResponse
```

This suggests the OAuth request to Google is malformed or the credentials are invalid.

### Error 2: TypeError - done is not a function
```
[Nest] 49121  - 01/12/2026, 7:27:27 PM   ERROR [ExceptionsHandler] done is not a function
TypeError: done is not a function
    at GoogleBusinessStrategy.validate (/Users/galsasson/revWave/apps/api/src/integrations/google/google-business.strategy.ts:71:5)
```

**This is the main issue!** The `validate` method is being called without the `done` callback parameter.

## 🔍 Root Cause Analysis

### File: `apps/api/src/integrations/google/google-business.strategy.ts`

The strategy has `passReqToCallback: true` in the constructor:
```typescript
super({
  // ...
  passReqToCallback: true, // Pass request to verify callback
});
```

But the `validate` method signature is:
```typescript
async validate(
  _req: any,
  accessToken: string,
  refreshToken: string,
  params: any,
  profile: any,
  done: VerifyCallback
): Promise<any> {
  // ...
  done(null, tokenData); // Line 71 - ERROR: done is not a function
}
```

### The Problem

When using `passReqToCallback: true` with NestJS Passport, the callback signature changes. However, NestJS's `PassportStrategy` wrapper may not be passing the `done` callback correctly when `passReqToCallback: true` is set.

Looking at the working `GoogleStrategy` in `apps/api/src/auth/google.strategy.ts`, it does NOT use `passReqToCallback: true` and the signature is:
```typescript
async validate(
  _accessToken: string,
  _refreshToken: string,
  profile: any,
  done: VerifyCallback
): Promise<any>
```

## 🛠️ Solution

### Option 1: Remove `passReqToCallback: true` (Recommended)

If we don't need the request object in the validate method, we can remove `passReqToCallback: true`:

```typescript
super({
  clientID,
  clientSecret,
  callbackURL,
  scope: [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  accessType: 'offline',
  prompt: 'consent',
  // Remove: passReqToCallback: true,
});
```

And update the validate signature:
```typescript
async validate(
  accessToken: string,
  refreshToken: string,
  params: any,
  profile: any,
  done: VerifyCallback
): Promise<any> {
  // ... same logic
}
```

### Option 2: Fix the validate method to work with async/await

If we need `passReqToCallback: true`, we need to handle the callback differently. NestJS Passport may be expecting a Promise return instead of using `done`.

## 📝 Additional Issues

1. **TokenError: Bad Request** - This might be due to:
   - Invalid `GOOGLE_BUSINESS_CLIENT_ID` or `GOOGLE_BUSINESS_CLIENT_SECRET`
   - Incorrect callback URL configuration in Google Cloud Console
   - Missing or incorrect OAuth scopes

2. **Callback URL mismatch** - Ensure the callback URL in `.env` matches exactly what's configured in Google Cloud Console:
   ```
   GOOGLE_BUSINESS_CALLBACK_URL=http://localhost:3001/integrations/google/callback
   ```

## ✅ Verification Steps

After fixing:
1. Restart the backend
2. Check logs for "GoogleBusinessStrategy initialized successfully"
3. Try connecting via `/integrations/google/connect` with a valid session
4. Verify the OAuth flow completes without errors

## 🔗 Related Files

- `apps/api/src/integrations/google/google-business.strategy.ts` - Main file with the bug
- `apps/api/src/integrations/integrations.controller.ts` - Controller that uses the strategy
- `apps/api/src/auth/google.strategy.ts` - Working reference implementation

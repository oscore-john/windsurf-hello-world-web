# ENG-22: Enable Sign Up / Login with Google

## Problem

The application currently supports only email/password authentication via Supabase Auth. Users who prefer social login or who do not want to create yet another email/password credential have no alternative. Adding Google as an OAuth provider lowers the friction for new sign-ups and provides a familiar, trusted login flow.

## Goal

Add a "Sign in with Google" button to the existing authentication screen so that users can sign up or sign in using their Google account. The feature should:

1. Use Supabase Auth's built-in Google OAuth provider (`signInWithOAuth`)
2. Integrate seamlessly with the existing auth flow — after Google sign-in, the user lands on the game screen exactly as with email/password
3. Work correctly with the app's static-export (`output: 'export'`) deployment on Vercel
4. Require no database schema changes — Supabase Auth handles OAuth user records internally
5. Preserve all existing email/password auth behaviour unchanged

## Non-Goals

- **No other OAuth providers.** Only Google is in scope. Apple, GitHub, Facebook, etc. are excluded.
- **No server-side rendering changes.** The app remains a static export with client-side auth.
- **No changes to the game, scoring, or account deletion logic.** These features should work identically for Google-authenticated users since they receive the same Supabase `auth.users` record.
- **No migration of existing email/password users to Google.** Account linking (connecting an existing email account to a Google identity) is out of scope.
- **No custom OAuth consent screen branding.** Default Google consent screen is acceptable.
- **No changes to Supabase database migrations or RLS policies.** The `scores` table RLS policies use `auth.uid()` which works identically for OAuth users.

## Context

### Current Auth Architecture

| Component | Detail |
|---|---|
| Auth provider | Supabase Auth (email/password only) |
| Client library | `@supabase/ssr` → `createBrowserClient` |
| Client singleton | `src/lib/supabase.ts` |
| Auth UI | `src/components/AuthScreen.tsx` — sign-in and sign-up forms |
| Auth state | `src/components/App.tsx` — `getSession()` + `onAuthStateChange()` |
| Deployment | Vercel static export (`output: 'export'` in `next.config.ts`) |
| Supabase project | `vyjswambsfbpebkwbwcx.supabase.co` |

### How Supabase Google OAuth Works

1. App calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
2. Browser redirects to Supabase Auth server → Google consent screen
3. Google redirects back to `https://<project-ref>.supabase.co/auth/v1/callback`
4. Supabase Auth exchanges the code for tokens, creates/updates the user in `auth.users`, and redirects to the app's `redirectTo` URL with session tokens in the URL fragment
5. The Supabase client library automatically picks up the tokens from the URL fragment and establishes the session

### Static Export Considerations

The app uses `output: 'export'` in `next.config.ts`, meaning there is no Next.js server at runtime. This is compatible with Supabase OAuth because:

- `signInWithOAuth` performs a full browser redirect (not a server-side exchange)
- The callback is handled by Supabase's own server (`<project-ref>.supabase.co/auth/v1/callback`)
- Session tokens are returned via URL fragment to the client-side app
- The existing `onAuthStateChange` listener in `App.tsx` will detect the new session automatically

### Redirect URL Configuration

The `redirectTo` URL must be registered in Supabase Auth's allowed redirect URLs. For this project:

- Production: The Vercel production URL (e.g. `https://windsurf-hello-world-web.vercel.app`)
- Preview deployments: Each Vercel preview gets a unique URL. A wildcard or pattern-based redirect URL may be needed, or `redirectTo` can be set dynamically at runtime based on `window.location.origin`.

## Assumptions

1. **Google Cloud Console project and OAuth credentials already exist or will be created by a team member.** The implementation agent cannot create Google Cloud projects or OAuth credentials autonomously — this requires Google Cloud Console access with billing enabled. The client ID and client secret must be configured in the Supabase dashboard.

2. **Supabase dashboard configuration will be done by a human.** Enabling Google as a provider in the Supabase Auth settings (Authentication → Providers → Google) requires entering the Google OAuth client ID and secret. This is a dashboard-only operation that cannot be done via client code.

3. **`redirectTo` will use `window.location.origin`** so it works for both production and Vercel preview deployments without hardcoding URLs.

4. **The existing `onAuthStateChange` listener in `App.tsx` will handle the OAuth callback session.** After Supabase redirects back with tokens in the URL fragment, the Supabase client automatically parses them and fires an auth state change event. No additional callback route or page is needed.

5. **The Google button will appear on the same auth screen,** below the existing email/password form, separated by a visual divider (e.g. "or" divider). Both sign-in and sign-up modes will show the Google button since Google OAuth handles both cases.

6. **Existing BDD tests for email/password auth remain unchanged.** New BDD scenarios will be added for Google OAuth, but existing scenarios are not modified.

## Open Questions

### OQ-1: Google Cloud OAuth Credentials (Human-Review-Required)

**Who creates the Google Cloud OAuth client ID and secret?**

A team member with Google Cloud Console access must:
1. Create or select a Google Cloud project
2. Configure the OAuth consent screen
3. Create an OAuth 2.0 Client ID (Web application type)
4. Add `https://vyjswambsfbpebkwbwcx.supabase.co/auth/v1/callback` as an authorized redirect URI
5. Provide the client ID and secret

This is a prerequisite that blocks the Supabase configuration step.

### OQ-2: Supabase Provider Configuration (Human-Review-Required)

**A team member must enable Google in the Supabase dashboard:**
1. Go to Authentication → Providers → Google
2. Toggle Google to enabled
3. Enter the client ID and secret from OQ-1
4. Save

Alternatively, this can be done via the Supabase Management API if the access token has sufficient permissions.

### OQ-3: Vercel Preview Redirect URLs

**Should all Vercel preview URLs be allowed as redirect targets?**

Options:
- **(a)** Add a wildcard redirect pattern for Vercel preview URLs (e.g. `https://*-oscore-johns-projects.vercel.app`) in Supabase Auth settings. This is convenient but slightly less restrictive.
- **(b)** Only allow the production URL. Preview deployments would not support Google login. This is simpler and more secure.
- **(c)** Use `window.location.origin` as `redirectTo` and add specific preview URLs as needed. Most flexible but requires manual updates.

**Recommendation:** Option (a) for development convenience. The Supabase redirect URL allowlist supports wildcards for subdomains.

## Acceptance Criteria

### AC-1: Google sign-in button visible on auth screen
- A "Sign in with Google" button is visible on the auth screen in both sign-in and sign-up modes.
- The button is visually distinct from the email/password form (separated by a divider).
- The button includes a recognizable Google icon or branding.

### AC-2: Google OAuth flow completes successfully
- Clicking the Google button redirects the user to the Google consent screen.
- After granting consent, the user is redirected back to the app.
- The game screen is displayed after successful authentication.
- The user's Google email is shown in the game header.

### AC-3: New Google user is created in Supabase
- A first-time Google sign-in creates a new user record in Supabase `auth.users`.
- The user can play the game, and scores are saved to the `scores` table.

### AC-4: Returning Google user can sign in again
- A user who previously signed in with Google can sign in again and their session is restored.
- Their previously saved scores are loaded correctly.

### AC-5: Email/password auth is unaffected
- All existing email/password sign-in, sign-up, sign-out, and error flows continue to work.
- No changes to existing auth UI elements or behaviour.

### AC-6: Sign out works for Google-authenticated users
- Clicking "Sign out" signs the user out and returns to the auth screen.
- The user can sign back in with Google.

### AC-7: Account deletion works for Google-authenticated users
- Clicking "Delete Account" and confirming calls the `delete-account` edge function and returns to the auth screen.

### AC-8: Static export compatibility
- The app continues to build with `next build` (static export).
- No server-side routes or API routes are introduced.

### AC-9: Error handling
- If the Google OAuth flow is cancelled by the user (e.g. they close the consent screen), the app returns to the auth screen without errors.
- If Google OAuth fails (e.g. provider not configured), a user-friendly error message is displayed.

## BDD Scenarios

### New Feature File: `features/google-auth.feature`

```gherkin
Feature: Google OAuth Authentication

  Users can sign in or sign up using their Google account
  as an alternative to email/password authentication.

  Scenario: Google sign-in button is visible on auth screen
    Given the user is on the auth screen
    Then a "Sign in with Google" button is visible

  Scenario: Google sign-in button is visible on sign-up form
    Given the user is on the auth screen
    When the user switches to the sign-up form
    Then a "Sign in with Google" button is visible

  Scenario: Clicking Google button initiates OAuth redirect
    Given the user is on the auth screen
    When the user clicks the "Sign in with Google" button
    Then the user is redirected to the Google consent screen

  Scenario: Successful Google sign-in displays game screen
    Given the user completes Google OAuth sign-in
    Then the game screen is displayed
    And the user's email is shown in the header

  Scenario: Google-authenticated user can sign out
    Given a Google-authenticated user is on the game screen
    When the user clicks the sign-out button
    Then the auth screen is displayed

  Scenario: Google-authenticated user can sign back in
    Given a user has previously signed in with Google
    And the user is on the auth screen
    When the user clicks the "Sign in with Google" button
    And completes the Google consent flow
    Then the game screen is displayed
    And their previously saved score is displayed

  Scenario: Google-authenticated user can delete account
    Given a Google-authenticated user is on the game screen
    When the user clicks "Delete Account" and confirms
    Then the auth screen is displayed
```

> **Note:** BDD scenarios involving the full Google OAuth redirect (consent screen interaction) are inherently difficult to automate in CI because they require a real Google account and interactive consent. The implementation should consider:
> - Marking redirect-dependent scenarios with a `@google-oauth` tag so they can be selectively skipped in CI
> - Testing the button presence and click behaviour (up to the redirect) in CI
> - Full end-to-end Google OAuth flow tested manually or with a dedicated test Google account

## Risks

### Autonomous-Safe

1. **UI changes to AuthScreen.tsx are straightforward.** Adding a button and calling `signInWithOAuth` is a well-documented Supabase pattern. No complex state management changes needed.

2. **`onAuthStateChange` already handles session detection.** The existing listener in `App.tsx` will pick up the OAuth session automatically. No changes needed to `App.tsx`.

3. **No database migration required.** OAuth users are stored in Supabase's `auth.users` table. The `scores` table references `auth.users(id)` via foreign key, and RLS policies use `auth.uid()` — both work identically for OAuth users.

4. **CSS changes are minimal.** Adding a button and divider to the auth card follows existing styling patterns.

### Human-Review-Required

5. **Google Cloud OAuth credentials must be created manually.** This requires Google Cloud Console access and cannot be automated. See OQ-1.

6. **Supabase provider configuration must be done via dashboard.** Enabling Google OAuth in Supabase requires entering the client ID and secret. See OQ-2.

7. **Redirect URL allowlist must include the app's URL(s).** The Supabase Auth settings must be updated to allow the production URL (and optionally preview URLs) as redirect targets. Incorrect configuration will cause OAuth to fail silently or with a cryptic error. See OQ-3.

8. **Google OAuth consent screen verification.** For production use with external users, the Google Cloud project's OAuth consent screen may need to go through Google's verification process. Unverified apps show a warning screen. This is acceptable for development/testing but should be addressed before wide release.

### Blocking

None identified. All blocking items are covered by the open questions (OQ-1, OQ-2) which require human action but do not prevent the specification from being complete.

## Escalation Conditions

- If the Google Cloud OAuth credentials cannot be obtained, the implementation cannot be tested end-to-end. Escalate to a team member with Google Cloud Console access.
- If the Supabase project does not allow enabling Google OAuth (e.g. plan limitations), escalate to the project administrator.
- If the `delete-account` edge function does not handle OAuth-only users correctly (e.g. it assumes a password exists), escalate for review of the edge function code.

## Definition of Done

1. A "Sign in with Google" button is displayed on the auth screen (both sign-in and sign-up modes).
2. Clicking the button initiates the Supabase Google OAuth flow.
3. Successful Google authentication lands the user on the game screen.
4. Google-authenticated users can play the game, save scores, sign out, and delete their account.
5. Email/password authentication continues to work unchanged.
6. The app builds successfully with `next build` (static export).
7. All existing BDD tests pass without modification.
8. New BDD feature file `features/google-auth.feature` is created with scenarios for Google auth.
9. Google OAuth credentials are configured in Google Cloud Console (human action).
10. Google provider is enabled in Supabase dashboard with correct credentials (human action).
11. Redirect URLs are configured in Supabase Auth settings (human action).

## Implementation Guidance

### 1. AuthScreen.tsx Changes

Add a Google sign-in button below both the sign-in and sign-up forms:

```tsx
// After the existing form, add:
<div className="auth-divider">
  <span>or</span>
</div>
<button
  type="button"
  className="google-btn"
  onClick={handleGoogleSignIn}
  disabled={loading}
>
  Sign in with Google
</button>
```

The handler:

```tsx
async function handleGoogleSignIn() {
  setError('');
  setLoading(true);
  const { error: authError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (authError) {
    setError(authError.message);
    setLoading(false);
  }
  // On success, browser redirects — no further client-side handling needed
}
```

### 2. CSS Additions (globals.css)

Add styles for the divider and Google button:

```css
.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  color: #64748b;
  font-size: 0.8rem;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.google-btn {
  width: 100%;
  padding: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.google-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}
.google-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 3. No Changes Required

- `App.tsx` — `onAuthStateChange` already handles new sessions
- `supabase.ts` — client singleton works for OAuth
- `GameScreen.tsx` — uses `user.email` which is populated for Google users
- `game-engine.ts` — no auth dependency
- Supabase migrations — no schema changes
- `delete-account` edge function — uses `auth.uid()` which works for OAuth users

### 4. Supabase Dashboard Configuration (Human)

1. Enable Google provider at: Supabase Dashboard → Authentication → Providers → Google
2. Enter Google OAuth client ID and client secret
3. Add redirect URLs to: Supabase Dashboard → Authentication → URL Configuration
   - Add the production Vercel URL
   - Optionally add a wildcard for preview URLs

### 5. Google Cloud Console Configuration (Human)

1. Create OAuth 2.0 Client ID (Web application)
2. Authorized redirect URI: `https://vyjswambsfbpebkwbwcx.supabase.co/auth/v1/callback`
3. Note the client ID and secret for Supabase configuration

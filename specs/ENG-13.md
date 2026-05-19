# ENG-13: Account Deletion

## Problem

The application currently provides no way for a user to delete their account. Once an account is created via Supabase Auth (email/password sign-up), the user record and associated data persist indefinitely. There is no UI affordance, client-side logic, or server-side mechanism for users to remove their account and personal data.

This is a basic expectation for any application that manages user accounts — both from a user-experience perspective and for compliance with data-protection regulations (e.g. GDPR right to erasure, Apple App Store guideline 5.1.1(v) requiring account deletion capability).

## Goal

Allow an authenticated user to permanently ("hard") delete their own account and all associated data through a self-service action in the application UI.

After deletion:

1. The user's Supabase Auth record is removed.
2. All user data in the `scores` table is removed (this already happens automatically via the `ON DELETE CASCADE` foreign key on `scores.user_id`).
3. The user's active session is terminated and they are returned to the auth screen.

## Non-Goals

- **Soft-delete / account deactivation** — the ticket explicitly requests "hard delete". No tombstone rows, disabled flags, or recovery grace periods are in scope.
- **Admin-initiated deletion** — only the authenticated user themselves can trigger deletion of their own account.
- **Bulk / batch deletion tooling** — no admin dashboard or management API for deleting multiple accounts.
- **Data export before deletion** — providing a data export/download feature is not in scope for this ticket.
- **Email confirmation or cool-down period** — while these are valuable safety features, they are out of scope unless the reviewer decides otherwise (see Open Questions).

## Context

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS, Supabase (Auth + Postgres), no build system |
| Hosting | Vercel (auto-deploys from `main`) |
| Auth provider | Supabase Auth (email/password) |
| Database | Supabase Postgres — `scores` table with `user_id uuid references auth.users(id) on delete cascade` |
| RLS | Enabled on `scores` with user-scoped SELECT/INSERT/UPDATE policies |
| Existing BDD tests | `features/authentication.feature`, `features/game.feature`, `features/score-persistence.feature` |
| CI | GitHub Actions — `bdd-tests.yml`, `verify-preview.yml`, `migrate.yml`, `migrate-dry-run.yml` |

### Current Application Architecture

The app is a purely client-side static site:

- **`index.html`** — DOM structure with auth screen and game screen
- **`app.js`** — Supabase client initialisation, auth flow (sign-in/sign-up/sign-out), score loading/saving
- **`game.js`** — Game mechanics (button movement, score tracking)
- **`style.css`** — All styling
- **Supabase JS SDK** loaded via CDN (`@supabase/supabase-js@2`)

Auth is handled entirely client-side via `supabase.auth.signInWithPassword()`, `supabase.auth.signUp()`, and `supabase.auth.signOut()`.

### Supabase Auth User Deletion

Supabase does not expose a client-side method to delete the currently authenticated user using the `anon` key. The `supabase.auth.admin.deleteUser(uid)` method requires the `service_role` key, which **must never be exposed in client-side code**.

This is the central technical constraint for this ticket. See Assumptions and Risks sections below.

### Database Cascade Behaviour

The `scores` table has `ON DELETE CASCADE` on the `user_id` foreign key referencing `auth.users(id)`. When a user is deleted from `auth.users`, their `scores` row is automatically removed by Postgres. No additional cleanup migration is needed for the `scores` table.

## Assumptions

1. **A Supabase Edge Function (or equivalent server-side endpoint) is acceptable.** Since the Supabase JS client SDK cannot delete users with the `anon` key, a server-side component is required. A Supabase Edge Function is the most natural fit given the project already uses Supabase for auth and database. This function would use the `service_role` key server-side to call `auth.admin.deleteUser()`.

2. **No confirmation email or cool-down period.** The deletion is immediate upon user confirmation via an in-app dialog. This keeps the implementation simple and matches the "hard delete" requirement. If a cool-down is desired, it should be specified as a follow-up ticket.

3. **A browser-native confirmation dialog is sufficient.** A `window.confirm()` prompt (e.g. "Are you sure you want to delete your account? This action cannot be undone.") provides adequate protection against accidental clicks. A custom modal is not required for the initial implementation.

4. **The existing `ON DELETE CASCADE` on `scores.user_id` is sufficient for data cleanup.** No additional migration is needed to handle orphaned data — Postgres handles this automatically when the `auth.users` row is removed.

5. **The Supabase project's Edge Functions runtime is available.** The project currently has no Edge Functions. Deploying one requires Supabase CLI setup and possibly a CI workflow addition for deployment.

## Open Questions

1. **Should there be a confirmation step beyond `window.confirm()`?** Options include:
   - (a) `window.confirm()` only — simplest, immediate (assumed default)
   - (b) Require the user to type their email or "DELETE" to confirm — more friction, less accidental deletion risk
   - (c) Email-based confirmation with a time-limited link — most secure, but significantly more complex

   *Recommendation:* Start with (a) for this ticket. Upgrade to (b) or (c) as a follow-up if needed.

2. **Should a cool-down / grace period be implemented?** E.g. mark the account for deletion and actually delete after 7 days, allowing the user to cancel. The ticket says "hard delete", which implies immediate. If a grace period is desired, this should be a separate ticket.

3. **Edge Function deployment strategy.** The project currently has no Edge Functions. Should the Edge Function be deployed manually, via Supabase CLI in CI, or via a new GitHub Actions workflow? *Recommendation:* Add a CI workflow for Edge Function deployment, similar to the existing `migrate.yml` for database migrations.

## Acceptance Criteria

1. **Delete button visible on game screen:** When the user is signed in and on the game screen, a "Delete Account" button (or equivalent affordance) is visible and accessible.

2. **Confirmation dialog before deletion:** Clicking the delete button presents a confirmation dialog clearly warning that the action is permanent and irreversible.

3. **Account deleted on confirmation:** Upon confirming deletion:
   - The user's `auth.users` record is removed from Supabase.
   - The user's `scores` row is removed (via cascade).
   - The user's session is terminated.
   - The user is redirected to the auth screen.

4. **Cancelled deletion has no effect:** If the user dismisses the confirmation dialog, no deletion occurs and the game screen remains unchanged.

5. **Deleted user cannot sign in:** After deletion, attempting to sign in with the deleted user's credentials returns an authentication error.

6. **Server-side deletion only:** The `service_role` key is never exposed in client-side code. User deletion is performed server-side (e.g. via a Supabase Edge Function) and the client authenticates the request using the user's JWT.

7. **Edge Function authenticates the caller:** The Edge Function verifies the caller's JWT and only deletes the user identified by that token — a user cannot delete another user's account.

8. **Error handling:** If the deletion request fails (network error, server error), the user sees an error message and their account remains intact.

## BDD Scenarios

```gherkin
Feature: Account Deletion

  Authenticated users can permanently delete their own account.
  Deletion removes the auth record and all associated data.

  Scenario: Delete account button is visible on game screen
    Given the user is signed in and on the game screen
    Then a delete-account button is visible

  Scenario: Confirming account deletion removes the account
    Given the user is signed in and on the game screen
    When the user clicks the delete-account button
    And confirms the deletion in the dialog
    Then the auth screen is displayed
    And the user cannot sign in with the deleted credentials

  Scenario: Cancelling account deletion has no effect
    Given the user is signed in and on the game screen
    When the user clicks the delete-account button
    And dismisses the confirmation dialog
    Then the game screen remains displayed
    And the user's score is unchanged

  Scenario: Deleted user's score data is removed
    Given the user is signed in and has a saved score
    When the user deletes their account
    And a new account is created with the same email
    Then the new account has no saved score
```

## Implementation Outline

This section provides architectural guidance for the implementer. It is not prescriptive — alternative approaches that satisfy the acceptance criteria are acceptable.

### 1. Supabase Edge Function: `delete-account`

Create a new Edge Function at `supabase/functions/delete-account/index.ts`:

- Extract the user's JWT from the `Authorization` header.
- Verify the JWT using the Supabase Auth client (server-side, using `service_role` key).
- Extract the `user_id` (sub claim) from the verified token.
- Call `supabase.auth.admin.deleteUser(user_id)`.
- Return appropriate HTTP status codes (200 on success, 401 if unauthenticated, 500 on error).

### 2. Client-side changes (`app.js`)

- Add a "Delete Account" button to the game screen header (next to the "Sign out" button).
- On click: show `window.confirm()` with a clear warning message.
- On confirmation: call the Edge Function via `fetch()` with the user's session JWT in the `Authorization` header.
- On success: call `supabase.auth.signOut()` and redirect to the auth screen.
- On error: display an error message to the user.

### 3. UI changes (`index.html` + `style.css`)

- Add the delete button element to the game header in `index.html`.
- Style the button distinctively (e.g. red/destructive colour) to differentiate it from sign-out.

### 4. BDD test implementation

- Add `features/account-deletion.feature` with the scenarios above.
- Add step definitions in `features/steps/account-deletion.steps.ts`.
- The `signedInUser` fixture from `features/steps/fixtures.ts` can be reused for test setup.

### 5. CI / deployment

- Add a workflow or extend existing CI to deploy the Edge Function on merge to `main`.
- Ensure the Edge Function has access to the `SUPABASE_SERVICE_ROLE_KEY` environment variable (configured in Supabase project settings, not in client code).

## Risks

### Autonomous-safe

- **UI placement and styling of the delete button.** Low risk — follows existing patterns in the game header. Can be implemented without human review.
- **BDD test implementation.** Low risk — follows existing patterns in `features/steps/`. The `signedInUser` fixture already handles account creation for tests.
- **`ON DELETE CASCADE` already handles `scores` cleanup.** Verified in the existing migration. No additional data cleanup needed.

### Human-review-required

- **Supabase Edge Function deployment.** The project has no existing Edge Functions. The first deployment establishes a pattern (directory structure, CI workflow, environment variable configuration). The reviewer should verify the Edge Function approach is acceptable and that the `SUPABASE_SERVICE_ROLE_KEY` is properly secured.
- **`service_role` key handling.** The Edge Function will use the `service_role` key to call `auth.admin.deleteUser()`. This key grants full database access. The implementation must ensure: (a) the key is only used server-side in the Edge Function, (b) CORS is configured appropriately, (c) the function validates the caller's JWT before performing deletion.
- **Irreversible data destruction.** Account deletion is permanent. While the ticket explicitly requests "hard delete", the reviewer should confirm that no recovery mechanism is needed.

### Blocking

- None identified. All required information is available and the technical approach is clear.

## Escalation Conditions

- If the Supabase project does not support Edge Functions (e.g. plan limitations), escalate to determine an alternative server-side approach.
- If the reviewer requires a confirmation mechanism more complex than `window.confirm()`, a follow-up ticket should be created for that enhancement.
- If additional tables referencing `auth.users` are added in the future without `ON DELETE CASCADE`, a data cleanup strategy will need to be revisited.

## Definition of Done

- [ ] A "Delete Account" button is present on the game screen.
- [ ] Clicking the button shows a confirmation dialog.
- [ ] Confirming deletion removes the user from `auth.users` and their `scores` row (via cascade).
- [ ] The user is signed out and returned to the auth screen after deletion.
- [ ] The deleted user cannot sign in again.
- [ ] The `service_role` key is never exposed in client-side code.
- [ ] The Edge Function validates the caller's JWT.
- [ ] Error states are handled gracefully with user-visible feedback.
- [ ] BDD feature file and step definitions are added and passing.
- [ ] Edge Function deployment is integrated into CI.
- [ ] Existing BDD tests continue to pass.

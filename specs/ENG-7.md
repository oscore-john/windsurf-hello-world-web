# ENG-7: User Authentication & High Score Display

## Problem

The `windsurf-hello-world-web` site is being transformed into a game where users score points (handled in a separate ticket). This ticket addresses the supporting infrastructure: users need to be able to **authenticate** (sign up / log in) and **view their personal high score**.

Today the site is a purely static HTML/CSS/JS page deployed on Vercel with zero backend, zero database, and zero authentication. There is no `package.json`, no framework, and no server-side logic. Adding authentication and persistent high scores requires introducing new infrastructure that does not currently exist.

## Goal

Provide a working authentication flow and a high-score display so that:

1. Users can create an account and log in.
2. Each authenticated user can see their personal high score.
3. The game (built in a separate ticket) can write scores to persistent storage, and this ticket's UI reads and displays the highest one.

## Non-Goals

- **Implementing the game itself** (scoring logic, gameplay, point accrual) — that is a separate ticket.
- **Leaderboards / social features** — only the authenticated user's own high score is in scope.
- **Admin dashboards or user management UIs** — basic auth flows only.
- **Custom domain or DNS changes.**
- **Migrating away from Vercel** — the site remains deployed on Vercel.

## Context

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS (no framework, no `package.json`) |
| Hosting | Vercel (static deployment, no serverless functions currently) |
| CI/CD | GitHub Actions `verify-preview.yml` (preview deployment smoke tests) |
| Existing auth | None |
| Existing database | None |
| Existing tests | None (beyond the CI preview verification) |

### Codebase Summary

- `index.html` — single-page entry point; renders a centered card with dynamic content.
- `style.css` — dark-themed glassmorphism styles.
- `works.js` — populates the card with a randomly selected famous work on each load.
- `.github/workflows/verify-preview.yml` — CI that verifies Vercel preview deployments via bypass header.
- `specs/` — existing shaping specs for ENG-3 (Vercel migration) and ENG-4 (protection bypass).

### Relationship to the Game Ticket

The game ticket (separate) will handle:
- Game mechanics and UI
- Score calculation and submission

This ticket provides the **auth layer** and **high-score read/display**. The game ticket will depend on the auth and storage infrastructure established here to persist scores.

## Assumptions

1. **A Backend-as-a-Service (BaaS) approach is acceptable.** Since the site is static and has no existing backend, a BaaS like Supabase or Firebase is the most pragmatic path for adding auth + a database without building a custom server. *(See Open Question #1 if the team prefers a different approach.)*

2. **Email/password authentication is the minimum viable auth method.** Social logins (Google, GitHub, etc.) can be added later but are not required for this ticket.

3. **The high score is a single numeric value per user.** The game ticket will define what "score" means; this ticket stores and retrieves `MAX(score)` for the authenticated user.

4. **The high score UI is a simple display element** (e.g., shown on the main page or a small profile section after login), not a complex dashboard.

5. **The site will remain a static Vercel deployment.** Auth and data calls happen client-side against the BaaS. No Vercel serverless functions are required for the initial implementation (though they could be added later for server-side validation).

6. **A `package.json` and minimal build tooling may be introduced** to manage the BaaS client SDK dependency. This is an acceptable change to the project structure.

## Open Questions

> These require human decision before implementation proceeds.

1. **Which auth/backend provider should be used?**
   - **Option A: Supabase** — The team already uses Supabase in `huunoo-fe`. A Supabase MCP integration is available in the Devin environment. Supabase provides auth, a Postgres database, and Row-Level Security (RLS) out of the box. *Recommended based on existing team familiarity.*
   - **Option B: Firebase** — Google's BaaS with Firebase Auth + Firestore/Realtime Database. Widely adopted but not currently used by the team.
   - **Option C: Custom backend** — A dedicated API (e.g., Vercel serverless functions + a database). More control but significantly more work for this simple use case.
   - **Option D: Other** — Specify.

2. **Should the existing `works.js` / random-artwork display be preserved alongside the new game + auth UI, or will the game ticket replace it entirely?** This affects how the auth UI is integrated into `index.html`.

3. **What auth methods are required at launch?**
   - Email/password only? *(assumed minimum)*
   - Add social login (Google, GitHub, etc.)?
   - Magic link / passwordless?

4. **Should the high score be visible to the user immediately on the main page after login, or on a separate profile/account page?**

5. **Does the game ticket's separate branch already exist?** If so, coordination on the shared data model (scores table schema) is needed to avoid conflicts. Provide a link to the game ticket/branch if available.

## Acceptance Criteria

1. **Sign-up flow**: A new user can create an account with at minimum an email and password. After sign-up, the user is authenticated and redirected to the main page.

2. **Login flow**: An existing user can log in with their credentials. After login, the user is authenticated and redirected to the main page.

3. **Logout flow**: An authenticated user can log out. After logout, the auth UI returns to the unauthenticated state.

4. **Auth state persistence**: Refreshing the page does not log the user out (session/token is persisted in the browser).

5. **High score display**: When authenticated, the user can see their personal high score. If the user has never played (no scores recorded), a sensible default is shown (e.g., "No scores yet" or "0").

6. **High score storage**: A persistent data store (database table) exists with at minimum: `user_id`, `score`, `created_at`. The high-score display reads `MAX(score)` for the authenticated user.

7. **Row-Level Security (or equivalent)**: A user can only read their own high score. One user cannot access another user's score data.

8. **Unauthenticated state**: When not logged in, the user sees a login/sign-up prompt instead of (or in addition to) the high-score display. The rest of the page remains functional.

9. **No regressions**: The existing CI workflow (`verify-preview.yml`) continues to pass. The page still loads and renders correctly on Vercel preview and production deployments.

## BDD Scenarios

```gherkin
Feature: User Authentication

  Scenario: New user signs up with email and password
    Given the user is on the main page
    And the user is not authenticated
    When the user clicks "Sign Up"
    And enters a valid email and password
    And submits the sign-up form
    Then an account is created
    And the user is authenticated
    And the page shows the authenticated state

  Scenario: Existing user logs in
    Given the user has an existing account
    And the user is on the main page
    And the user is not authenticated
    When the user clicks "Log In"
    And enters their email and password
    And submits the login form
    Then the user is authenticated
    And the page shows the authenticated state

  Scenario: User logs out
    Given the user is authenticated
    When the user clicks "Log Out"
    Then the user is logged out
    And the page shows the unauthenticated state

  Scenario: Auth state persists across page refresh
    Given the user is authenticated
    When the user refreshes the page
    Then the user remains authenticated

  Scenario: Login with invalid credentials
    Given the user is on the login form
    When the user enters an incorrect email or password
    And submits the login form
    Then an error message is displayed
    And the user remains unauthenticated

  Scenario: Sign-up with already-registered email
    Given the user is on the sign-up form
    When the user enters an email that is already registered
    And submits the sign-up form
    Then an error message is displayed indicating the email is taken

Feature: High Score Display

  Scenario: Authenticated user with no scores sees default state
    Given the user is authenticated
    And the user has never played the game (no score records)
    When the user views the high-score section
    Then the display shows "No scores yet" or equivalent

  Scenario: Authenticated user sees their high score
    Given the user is authenticated
    And the user has played the game and recorded scores of 100, 250, and 175
    When the user views the high-score section
    Then the display shows "250" as the high score

  Scenario: High score updates after a new highest score
    Given the user is authenticated
    And the user's current high score is 250
    When the user plays and records a score of 300
    And views the high-score section
    Then the display shows "300" as the high score

  Scenario: Unauthenticated user cannot see high scores
    Given the user is not authenticated
    When the user views the main page
    Then no high-score section is visible
    And a login/sign-up prompt is shown

  Scenario: User cannot access another user's scores
    Given user A is authenticated
    And user B has a high score of 500
    When user A queries the scores API
    Then user A receives only their own scores
    And user B's scores are not returned

Feature: Data Model

  Scenario: Scores table enforces row-level security
    Given the scores table has RLS enabled
    When user A inserts a score with user_id = user_A
    Then the insert succeeds
    When user A attempts to query scores where user_id = user_B
    Then no rows are returned
```

## Risks

### Human-Review-Required

1. **Authentication infrastructure is a new, significant addition.** This is the first time auth is being added to this project. The choice of provider (Supabase, Firebase, etc.) has long-term implications for the project's architecture and should be explicitly approved. *(Escalation Boundary #5 — auth changes.)*

2. **Database schema design.** The scores table schema must be coordinated with the game ticket to ensure compatibility. If the game ticket has already defined a schema, this ticket must align with it. *(Escalation Boundary #3 — cross-ticket coordination.)*

3. **BaaS credentials / API keys.** A new Supabase project (or equivalent) will need to be provisioned. The anon/public key will be embedded in client-side code (standard for BaaS), but the service-role key must never be exposed. Decide where these are stored (Vercel env vars, GitHub secrets, etc.). *(Escalation Boundary #5 — credential handling.)*

4. **Introduction of `package.json` / build tooling.** The project is currently a zero-dependency static site. Adding a BaaS SDK requires either a `<script>` tag (CDN) or a bundler + `package.json`. This changes the project structure and Vercel build configuration. Should be confirmed.

### Autonomous-Safe

5. **UI implementation.** Building the login/sign-up/logout forms and the high-score display widget is straightforward frontend work that can be done without additional review.

6. **RLS policy creation.** Standard Supabase RLS policies for user-scoped data are well-documented and low-risk.

7. **CI compatibility.** The existing `verify-preview.yml` checks for page content — it may need minor updates if the page structure changes, but this is low-risk.

### Blocking

8. **Provider decision required.** Implementation cannot begin until Open Question #1 (which auth/backend provider) is answered. The entire architecture depends on this choice.

9. **Game ticket coordination.** If the game ticket has already started and defined a data model, this ticket must align. If it hasn't, this ticket should define the schema and the game ticket should consume it. The relationship must be clarified (Open Question #5).

## Escalation Conditions

- If the team cannot decide on a BaaS provider, escalate to the engineering lead for a decision.
- If the game ticket has already created a conflicting data model or auth approach, escalate for cross-ticket alignment.
- If Supabase is chosen and a new project needs provisioning, a team member with Supabase org admin access must create it (or grant Devin access to do so via MCP).
- If the team wants server-side score validation (to prevent score tampering), this significantly increases scope and should be treated as a separate concern.

## Proposed Data Model (Supabase — pending Open Question #1)

> This is a **draft** assuming Supabase is chosen. Adjust if a different provider is selected.

### Table: `scores`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK to `auth.users(id)`, NOT NULL | Supabase auth user reference |
| `score` | `integer` | NOT NULL, CHECK >= 0 | Individual game score |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | When the score was recorded |

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Users can read only their own scores
CREATE POLICY "Users can read own scores"
  ON scores FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert only their own scores
CREATE POLICY "Users can insert own scores"
  ON scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE (scores are immutable records)
```

### High Score Query

```sql
SELECT COALESCE(MAX(score), 0) AS high_score
FROM scores
WHERE user_id = auth.uid();
```

## Implementation Path (once open questions are resolved)

1. **Provision BaaS project** (e.g., create Supabase project, or configure Firebase).
2. **Create the `scores` table** with RLS policies.
3. **Add auth UI to the frontend** — sign-up, login, logout forms/buttons integrated into `index.html`.
4. **Add high-score display** — a section visible to authenticated users showing their `MAX(score)`.
5. **Integrate the BaaS client SDK** — either via CDN `<script>` tag or introduce `package.json` + bundler.
6. **Store API keys** — anon key in client code or Vercel env var; service key in Vercel env var only.
7. **Update CI** — adjust `verify-preview.yml` if page content assertions change.
8. **Coordinate with game ticket** — ensure the game can write to the `scores` table using the same auth session.

## Definition of Done

- [ ] Open Questions #1–#5 answered by reviewer
- [ ] BaaS project provisioned and configured
- [ ] Users can sign up with email/password
- [ ] Users can log in and log out
- [ ] Auth session persists across page refresh
- [ ] Authenticated users see their high score (or "No scores yet")
- [ ] `scores` table exists with RLS enforcing per-user access
- [ ] Unauthenticated users see a login/sign-up prompt
- [ ] Existing CI (`verify-preview.yml`) passes
- [ ] Game ticket has visibility into the auth + data model for integration

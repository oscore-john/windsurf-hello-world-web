# ENG-19: Port to Next.js

## Problem

The application is currently a static HTML/CSS/JS site (`index.html`, `app.js`, `game.js`, `style.css`) served as-is by Vercel. While functional, this architecture has limitations:

- No component reusability or composition model
- Global mutable state via IIFEs and `var` declarations
- Manual DOM manipulation for all UI updates
- No module system (Supabase loaded via CDN `<script>` tag)
- No TypeScript in application code (only in BDD tests)
- Difficult to extend with new pages/routes or shared layouts

Porting to Next.js provides a modern React-based architecture with component model, proper module system, TypeScript support, and Vercel-native deployment optimisation.

## Goal

Replace the static HTML/JS application with a functionally equivalent Next.js application that:

1. Preserves all existing user-facing behaviour (auth, game, scoring, account deletion)
2. Uses Next.js App Router with TypeScript
3. Integrates Supabase via `@supabase/ssr` (replacing CDN script tag)
4. Deploys to Vercel with zero-downtime transition
5. Keeps existing BDD tests passing without modification to feature files

## Non-Goals

- **No new features.** This is a 1:1 port of existing behaviour.
- **No backend changes.** Supabase migrations, edge functions, and database schema remain untouched.
- **No redesign.** Visual appearance must remain identical. Port existing CSS as-is.
- **No changes to BDD feature files.** Step definitions may need minor adjustments for selector changes, but the `.feature` files themselves must not change.
- **No server-side rendering of game logic.** The game and auth flows are inherently client-side and should remain so (`"use client"` components).
- **`works.js` is not ported.** This file references DOM elements (`#eyebrow`, `#title`, `#subtitle`, `#status`) that do not exist in the current `index.html`. It is unused legacy code from the original landing page and is excluded from the port.

## Context

### Current Architecture

| File | Role |
|---|---|
| `index.html` | Single HTML page with auth screen and game screen |
| `style.css` | All application styles (243 lines) |
| `app.js` | Supabase client init, auth flows, score CRUD, UI state (230 lines) |
| `game.js` | Game engine: button creation, movement, scoring, colours (166 lines) |
| `works.js` | Unused legacy code (70 lines) |
| `package.json` | Only devDependencies: `@playwright/test`, `playwright-bdd` |
| `playwright.config.ts` | BDD test configuration |
| `features/` | 5 feature files, 6 step definition files |
| `supabase/` | 1 migration, 1 edge function (`delete-account`) |
| `.github/workflows/` | 5 workflows (verify-preview, bdd-tests, migrate, migrate-dry-run, deploy-functions) |

### Supabase Integration Points

- **Auth**: `supabase.auth.signInWithPassword`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`
- **Database**: `supabase.from("scores").select/upsert` with RLS policies
- **Edge Function**: `POST /functions/v1/delete-account` (called via `fetch` with bearer token)
- **Client config**: URL `https://vyjswambsfbpebkwbwcx.supabase.co` + anon key (currently hardcoded in `app.js`)

### Deployment

- Vercel static deployment (currently serves files as-is)
- Preview deployments protected via `x-vercel-protection-bypass` header/query param
- BDD tests run against preview and production URLs via GitHub Actions

## Assumptions

1. **Next.js 15 with App Router** is the target framework version (latest stable, Vercel-recommended).
2. **TypeScript** will be used for all new application code. The project already uses TypeScript for BDD tests.
3. **`@supabase/ssr`** is the correct Supabase integration package for Next.js (replaces CDN script).
4. **Supabase credentials** will be moved to environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) instead of being hardcoded. Vercel environment variables should be configured for these.
5. **CSS will be ported as a global stylesheet** (`style.css` imported in the root layout) to minimize visual divergence. No CSS framework migration (e.g., Tailwind) is included in this scope.
6. **The game is entirely client-side.** All game components will use `"use client"` directive. There is no benefit to server-rendering the auth screen or game area since both depend on client-side Supabase auth state.
7. **Existing Vercel project settings** (domain, deployment protection, environment variables) remain as-is. Next.js is auto-detected by Vercel.
8. **The `works.js` file can be deleted** as part of cleanup since it is unused.

## Open Questions

None. The scope is well-defined and all architectural decisions follow established Next.js + Supabase best practices.

## Acceptance Criteria

### AC-1: Next.js project structure
- The repository contains a valid Next.js App Router project with `next.config.ts`, `tsconfig.json`, and `package.json` containing `next`, `react`, `react-dom`, and `@supabase/ssr` as dependencies.
- The app builds successfully with `next build`.

### AC-2: Auth screen renders and functions
- Visiting the root URL (`/`) displays the auth screen with sign-in form by default.
- Users can toggle between sign-in and sign-up forms.
- Signing in with valid credentials transitions to the game screen.
- Signing up creates a new account and transitions to the game screen.
- Invalid credentials display an error message on the auth screen.

### AC-3: Game screen renders and functions
- After authentication, the game screen is displayed with:
  - A header showing current score, best score, user email, delete account button, and sign out button.
  - A game area containing 3 target buttons with outer rings.
- Clicking a target button increments the score by 1.
- Clicking an outer ring decrements the score by 1.
- Buttons move to new random positions every ~1 second.
- Buttons display random colours from the defined palette on each move.

### AC-4: Score persistence
- Scores are saved to the Supabase `scores` table via upsert (debounced, ~2 seconds after last click).
- On sign-in, the user's previously saved score and best score are loaded and displayed.
- Best score only increases; outer-ring clicks do not reduce it.

### AC-5: Sign out
- Clicking "Sign out" saves the current score, signs the user out of Supabase, and returns to the auth screen.

### AC-6: Account deletion
- Clicking "Delete Account" shows a confirmation dialog.
- Confirming calls the `delete-account` edge function and returns to the auth screen.
- Cancelling leaves the game screen unchanged.

### AC-7: Supabase credentials via environment variables
- Supabase URL and anon key are read from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables (not hardcoded).

### AC-8: Visual parity
- The application's visual appearance is functionally identical to the current static site. Same colours, layout, glassmorphism effects, typography, and animations.

### AC-9: BDD tests pass
- All existing BDD feature files pass against the Next.js application without changes to the `.feature` files.
- Step definitions may be updated if element selectors change, but test intent and scenarios remain identical.

### AC-10: CI workflows function correctly
- `verify-preview.yml` passes against preview deployments (may need content marker updates from `game.js`/`app.js` to Next.js-appropriate markers).
- `bdd-tests.yml` passes against preview and production deployments.
- `migrate.yml`, `migrate-dry-run.yml`, and `deploy-functions.yml` are unaffected.

### AC-11: Vercel deployment
- The application deploys successfully to Vercel as a Next.js project.
- Preview deployments and production deployments both function correctly.
- Deployment protection continues to work.

## BDD Scenarios

All existing feature files remain unchanged and constitute the BDD specification for this port:

- `features/authentication.feature` — Sign up, sign in, sign out, invalid credentials
- `features/game.feature` — Multiple buttons visible, clicking increments score, buttons move, best score updates
- `features/score-persistence.feature` — Score persists across sign-out/sign-in
- `features/outer-ring.feature` — Ring click deducts point, score can go negative, best score unaffected
- `features/account-deletion.feature` — Delete button visible, confirm deletes, cancel no-ops, data removed

No new BDD scenarios are needed. The port is behaviour-preserving.

### Port-Specific Verification Scenarios

```gherkin
Feature: Next.js Port Verification

  Scenario: Application serves via Next.js
    Given the application is deployed
    When a user navigates to the root URL
    Then the response is served by Next.js (contains Next.js markers in page source)

  Scenario: Environment variables are used for Supabase config
    Given the application source code
    Then no Supabase URL or anon key is hardcoded in client bundles
    And the application reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the environment
```

## Risks

### Autonomous-Safe

1. **Selector changes breaking BDD step definitions.** Converting from vanilla HTML to React may change element IDs or structure. Step definitions in `features/steps/` may need updates to match new selectors. Risk is low — the current HTML uses `id` attributes which should be preserved in the React port.

2. **CSS specificity differences.** Next.js may inject its own styles or modify the cascade. Global CSS import should mitigate this, but minor tweaks may be needed. Visually verify against the current site.

3. **Supabase CDN removal.** The current app loads Supabase via `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js">`. The Next.js port uses `@supabase/ssr` as an npm dependency. The API surface is slightly different — `createBrowserClient` vs `createClient`. Implementation must ensure all auth methods and database operations work identically.

4. **Game timer behaviour in React.** The game uses `setInterval` for button movement. In React, intervals inside `useEffect` need proper cleanup to avoid memory leaks or stale closures. The game engine should either be kept as a standalone module (imported and managed via refs) or carefully reimplemented with React lifecycle awareness.

### Human-Review-Required

5. **Vercel environment variables.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be added to the Vercel project settings. The current hardcoded values need to be configured as environment variables in the Vercel dashboard. A team member with Vercel access should verify this is set up correctly.

6. **`verify-preview.yml` content checks.** The current workflow checks that the response body contains `game.js` and `app.js`. After the Next.js port, these files will be bundled differently (as Next.js chunks). The content check assertions need to be updated to verify Next.js-appropriate markers. Review the updated checks to ensure they still validate a successful deployment.

## Escalation Conditions

- If Vercel environment variable configuration cannot be completed by the implementation agent, escalate to a team member with Vercel project admin access.
- If BDD tests require changes beyond step definition selector updates (i.e., the test logic or feature files need changing), escalate for review — this may indicate a behaviour regression in the port.

## Definition of Done

1. Next.js App Router project builds and runs locally (`next dev`, `next build`).
2. All 5 existing BDD feature files pass against the Next.js application.
3. Vercel preview deployment succeeds and is accessible.
4. `verify-preview.yml` CI workflow passes (with updated content markers).
5. `bdd-tests.yml` CI workflow passes against the preview deployment.
6. Visual appearance matches the current static site.
7. Supabase credentials are sourced from environment variables.
8. `works.js` is removed from the repository.
9. No changes to Supabase migrations, edge functions, or database schema.

## Implementation Guidance

### Suggested Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, import global CSS
│   │   ├── page.tsx            # Main page (client component orchestrating auth/game)
│   │   └── globals.css         # Ported from style.css
│   ├── components/
│   │   ├── AuthScreen.tsx      # Auth card with sign-in/sign-up forms
│   │   ├── GameScreen.tsx      # Game header + game area
│   │   ├── GameArea.tsx        # Button spawning, movement, scoring logic
│   │   └── GameHeader.tsx      # Score display, user info, sign out, delete account
│   └── lib/
│       └── supabase.ts         # createBrowserClient setup using env vars
├── features/                   # Unchanged BDD tests
├── supabase/                   # Unchanged
├── specs/                      # Specification files
├── next.config.ts
├── tsconfig.json
├── package.json
└── .github/workflows/          # Updated verify-preview content checks
```

### Key Implementation Notes

1. **Supabase client**: Use `createBrowserClient` from `@supabase/ssr` in a shared `lib/supabase.ts`. All components import from here.

2. **Game engine approach**: The game engine (`game.js`) relies heavily on direct DOM manipulation and `setInterval`. Two viable approaches:
   - **(Recommended) Keep as standalone module**: Convert `game.js` to a TypeScript module that exports `start(area, initialScore, callback)`, `stop()`, and `getScore()`. Mount via a `useRef` + `useEffect` in `GameArea.tsx`. This minimizes rewrite risk.
   - **Full React rewrite**: Reimplement with React state and `useEffect` timers. More idiomatic but higher risk of subtle behaviour changes.

3. **Auth state management**: Use a `useState`/`useEffect` pattern to track Supabase session state. `onAuthStateChange` listener set up in a top-level effect.

4. **Score save on unload**: Preserve the `beforeunload` event listener for saving scores when the page is closed.

5. **`verify-preview.yml` update**: Change content checks from `game.js`/`app.js` to `_next` (Next.js asset prefix) or another reliable marker of a successful Next.js deployment.

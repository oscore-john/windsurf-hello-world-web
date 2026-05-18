# ENG-10: Living Documentation

## Problem

The `windsurf-hello-world-web` project has no executable test infrastructure. Existing specifications live as markdown documents in `/specs/` (ENG-3, ENG-4, ENG-6, ENG-7) — these are useful for shaping but are not executable, not linked to test results, and can become stale as the codebase evolves.

The project now has meaningful user-facing behaviour worth validating continuously:

- **Authentication** — sign up, sign in, sign out, session persistence (Supabase Auth)
- **Game mechanics** — button movement, score incrementing, score display
- **Score persistence** — saving scores to Supabase, loading high scores, RLS enforcement

The ticket author is familiar with **SpecFlow** (a .NET BDD framework) and **Pickles** (a living documentation generator that produces browsable HTML from Gherkin feature files and test results). They are open to any equivalent framework suitable for the project's JavaScript stack.

## Goal

Introduce a living documentation system so that:

1. **Behavioural specifications are written as Gherkin `.feature` files** — human-readable, structured, and version-controlled alongside the code.
2. **Feature files are executable** — backed by step definitions that exercise the application via browser automation.
3. **Living documentation is generated** — an HTML report is produced from feature files and test results, showing which scenarios pass/fail, browsable by feature.
4. **CI integration** — tests run automatically and documentation artifacts are generated on each PR/push.

The end result mirrors the SpecFlow + Pickles workflow: Gherkin specs → automated execution → browsable living documentation.

## Non-Goals

- **Full test coverage of every edge case** — the initial implementation should cover core happy-path scenarios for auth, game, and score persistence. Comprehensive edge-case coverage is a follow-up.
- **Migrating existing markdown specs to feature files** — the `/specs/*.md` documents serve a different purpose (shaping/design). Feature files describe executable behavioural scenarios, not design rationale.
- **Unit tests or API-level tests** — this ticket focuses on BDD-style end-to-end tests that exercise the app through the browser.
- **Custom documentation site or theme** — the built-in Cucumber HTML report or Playwright HTML report is sufficient. No custom documentation portal is in scope.
- **Modifying application code** — this ticket adds test infrastructure alongside the existing app. No functional changes to `index.html`, `app.js`, `game.js`, or `style.css`.

## Context

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS, Supabase (Auth + Postgres), no build system |
| Hosting | Vercel (auto-deploys from `main`) |
| CI/CD | GitHub Actions `verify-preview.yml` (preview deployment smoke tests) |
| Existing tests | None (beyond CI preview verification) |
| Existing specs | Markdown documents in `/specs/` (ENG-3, ENG-4, ENG-6, ENG-7) |
| Package manager | None (`package.json` does not exist yet) |

### Current Application State

The app is a click-the-button game with Supabase authentication:

- **Auth screen** (`index.html`) — sign-in / sign-up forms using Supabase Auth (email/password)
- **Game screen** — a button that moves randomly every 1 second; clicking it increments the score
- **Score persistence** — scores are saved to a Supabase `scores` table with RLS; high scores are loaded on login
- **Supabase integration** — client-side SDK loaded via CDN (`@supabase/supabase-js@2`); anon key embedded in `app.js`

### SpecFlow + Pickles Equivalent in JavaScript

| .NET Ecosystem | JavaScript Equivalent | Role |
|---|---|---|
| SpecFlow | **Cucumber.js** or **playwright-bdd** | BDD framework that executes Gherkin `.feature` files |
| NUnit/xUnit (test runner) | **Playwright Test** | Test runner with browser automation |
| Pickles | **Cucumber HTML Reporter** or **Playwright HTML Report** | Generates browsable living documentation from feature files + test results |

## Assumptions

1. **Introducing `package.json` is acceptable.** The project currently has no Node.js dependencies. Adding a test framework requires `package.json` with dev dependencies. This does not affect the production static deployment on Vercel (no build step is needed for the app itself; only the test tooling uses Node.js).

2. **Playwright is acceptable for browser automation.** Playwright provides reliable cross-browser testing and is well-integrated with both Cucumber.js and the `playwright-bdd` library. It can run headlessly in CI.

3. **Tests will run against a deployed preview URL (or localhost).** Since the app is purely client-side with a remote Supabase backend, tests can target either a Vercel preview deployment or a local file server. Running against the preview URL is preferred for CI to validate the actual deployment.

4. **A dedicated test Supabase user account is acceptable for CI.** Automated tests that exercise auth flows need a test account (email/password). This can be pre-created or created/torn down as part of the test setup.

5. **The living documentation artifact (HTML report) will be generated as a CI artifact** (e.g., uploaded via `actions/upload-artifact`) rather than deployed to a separate hosting service. Hosting the docs on GitHub Pages or a dedicated URL is a possible follow-up but out of scope for the initial implementation.

6. **Feature files will live in a `/features/` directory** at the repository root, following Cucumber convention.

## Open Questions

> These require human decision before implementation proceeds.

1. **Which BDD framework approach?**
   - **Option A: `playwright-bdd`** — A library that integrates Gherkin feature files directly with the Playwright test runner. Step definitions are written using Playwright's API. Supports Cucumber HTML reports via `cucumberReporter()` and Playwright's own HTML report (which shows Gherkin steps natively). Modern, actively maintained (666+ stars), and provides the tightest integration between BDD and Playwright. *Recommended — it provides the closest experience to SpecFlow + Pickles with less boilerplate.*
   - **Option B: `@cucumber/cucumber` (Cucumber.js) + Playwright** — The canonical Cucumber implementation for JavaScript. Feature files and step definitions follow the standard Cucumber pattern. Requires a separate Playwright setup within step definitions. Generates standard Cucumber reports. More traditional but more configuration overhead.
   - **Option C: Other** — e.g., CodeceptJS with BDD plugin, or a custom Gherkin parser. Less conventional.

2. **Should tests run against Vercel preview deployments in CI, or against a local dev server?**
   - **Option A: Preview URL** — Tests run after Vercel deploys the preview. Validates the actual deployed artifact. Requires the `VERCEL_AUTOMATION_BYPASS_SECRET` to access protected previews. May add latency (must wait for deploy to complete). *Recommended for CI — tests the real deployment.*
   - **Option B: Local server** — Tests spin up a local HTTP server (e.g., `npx serve .`) and run against `localhost`. Faster, no Vercel dependency, but doesn't validate the deployment pipeline.
   - **Option C: Both** — Local for development speed, preview URL for CI. More configuration but most thorough.

3. **What initial feature coverage is expected?**
   - **Option A: Auth flows only** — Sign up, sign in, sign out, session persistence. Smallest initial scope.
   - **Option B: Auth + game mechanics** — Add scenarios for button clicking, score incrementing, button movement.
   - **Option C: Auth + game + score persistence** — Full happy-path coverage including Supabase read/write. *Recommended — provides meaningful living documentation that covers all core behaviours.*

4. **How should the living documentation artifact be consumed?**
   - **Option A: CI artifact download** — HTML report uploaded as a GitHub Actions artifact; reviewers download and open locally. Simplest to implement.
   - **Option B: GitHub Pages** — Auto-publish the HTML report to a GitHub Pages site on each `main` merge. Always-accessible URL. Requires enabling GitHub Pages on the repo.
   - **Option C: PR comment with link** — Bot posts a link to the report in each PR. Requires additional CI configuration.

5. **Test account credentials for CI** — Automated auth tests need a pre-existing Supabase test account (email + password). Should this be:
   - A dedicated CI test account (e.g., `ci-test@example.com`) created manually once?
   - Created and torn down dynamically per test run via Supabase Admin API?
   - An existing account whose credentials are stored as GitHub Actions secrets?

## Acceptance Criteria

1. **Feature files exist** — Gherkin `.feature` files are present in the repository (e.g., under `/features/`) describing the application's core behaviours (authentication, game mechanics, score persistence).

2. **Feature files are executable** — Running a single command (e.g., `npm test` or `npx playwright test`) executes the step definitions against the application and produces pass/fail results.

3. **Living documentation is generated** — After test execution, an HTML report is produced that:
   - Lists all features and scenarios
   - Shows pass/fail status for each scenario
   - Displays the Gherkin text (Given/When/Then) alongside results
   - Is browsable (clickable features/scenarios, not just a flat log)

4. **CI workflow exists** — A GitHub Actions workflow runs the BDD tests on PRs and/or pushes and uploads the living documentation HTML as an artifact (or publishes it, depending on Open Question #4).

5. **Step definitions use browser automation** — Step definitions interact with the application through a real browser (via Playwright), not mocked/stubbed interactions. This ensures the living documentation reflects actual application behaviour.

6. **No regressions** — The existing `verify-preview.yml` workflow continues to pass. The application itself is not modified.

7. **Developer onboarding documentation** — The `README.md` is updated with instructions on:
   - How to install test dependencies (`npm install`)
   - How to run tests locally
   - How to view the generated living documentation
   - How to add new feature files and step definitions

## BDD Scenarios

> These are the scenarios that the living documentation system itself should validate. They also serve as examples of the Gherkin feature files that will be created.

```gherkin
Feature: User Authentication

  Scenario: New user signs up successfully
    Given the user is on the auth screen
    When the user switches to the sign-up form
    And enters a valid email and password
    And submits the sign-up form
    Then the game screen is displayed
    And the user's email is shown in the header

  Scenario: Existing user signs in successfully
    Given a user account exists with known credentials
    And the user is on the auth screen
    When the user enters their email and password
    And submits the sign-in form
    Then the game screen is displayed
    And the user's email is shown in the header

  Scenario: User signs out
    Given the user is signed in and on the game screen
    When the user clicks the sign-out button
    Then the auth screen is displayed

  Scenario: Sign-in with invalid credentials shows error
    Given the user is on the auth screen
    When the user enters an incorrect password
    And submits the sign-in form
    Then an error message is displayed on the auth screen
    And the auth screen remains visible

Feature: Click-the-Button Game

  Scenario: Score increments on button click
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the target button
    Then the score display shows 1

  Scenario: Button moves to a new position periodically
    Given the user is signed in and on the game screen
    When 2 seconds elapse
    Then the target button has moved from its initial position

  Scenario: Score is displayed on the target button
    Given the user is signed in and on the game screen
    When the user clicks the target button 3 times
    Then the target button label shows 3

Feature: Score Persistence

  Scenario: High score is loaded on sign-in
    Given a user has a previously saved best score of 10
    When the user signs in
    Then the best score display shows 10

  Scenario: Score persists after sign-out and sign-in
    Given the user is signed in and scores 5 points
    When the user signs out
    And signs back in with the same credentials
    Then the score display reflects the previously saved score

Feature: Living Documentation

  Scenario: HTML report is generated after test run
    Given the BDD test suite has been executed
    When the test run completes
    Then an HTML living documentation report exists in the output directory
    And the report contains all feature names
    And each scenario shows a pass or fail status
```

## Risks

### Human-Review-Required

1. **Introduction of `package.json` and Node.js dev dependencies.** This is the first time Node.js tooling is added to the project. While it only affects dev/test workflows (not the production static site), it changes the project's development requirements. Developers will now need Node.js installed locally to run tests. *(Escalation Boundary #5 — changes development workflow.)*

2. **CI secrets for test account.** If automated tests need to sign in to Supabase, a test account's credentials must be stored as GitHub Actions secrets. This touches credential management. *(Escalation Boundary #5 — credential handling.)*

3. **Supabase rate limiting / test isolation.** Running automated auth flows (sign up/sign in) against the production Supabase instance repeatedly could trigger rate limits. A strategy for test isolation (dedicated test user, or a separate Supabase project for testing) should be decided. *(Escalation Boundary #4 — product/infrastructure decision.)*

### Autonomous-Safe

4. **Feature file authoring.** Writing Gherkin scenarios and step definitions is standard development work with no safety concerns.

5. **Playwright configuration.** Setting up Playwright with the BDD framework is well-documented and low-risk.

6. **CI workflow for running tests.** Adding a new GitHub Actions workflow that runs tests and uploads artifacts is standard CI work.

7. **README updates.** Adding developer documentation for the testing setup is straightforward.

### Blocking

8. **Framework decision required.** Implementation cannot begin until Open Question #1 (which BDD framework) is answered. The project structure, configuration, and step definition patterns differ significantly between options.

9. **Test target decision required.** Open Question #2 (preview URL vs. localhost) affects CI workflow design and whether the existing `VERCEL_AUTOMATION_BYPASS_SECRET` needs to be available to the test workflow.

## Escalation Conditions

- If Supabase rate limits are hit during automated test runs, escalate to decide on a test isolation strategy (separate Supabase project, mock server, or test account with rate limit exemption).
- If the chosen BDD framework does not produce satisfactory living documentation output, escalate for framework re-evaluation before proceeding.
- If the team decides living documentation should be publicly hosted (e.g., GitHub Pages), this requires enabling GitHub Pages on the repo — which may need repo admin approval.

## Implementation Path (once open questions are resolved)

1. **Initialise Node.js project** — `npm init` to create `package.json`; add to `.gitignore` as needed.
2. **Install BDD framework** — e.g., `npm install -D @playwright/test playwright-bdd` (Option A) or `npm install -D @cucumber/cucumber playwright` (Option B).
3. **Configure Playwright** — Create `playwright.config.ts` with BDD configuration, base URL targeting the app.
4. **Create feature files** — Write `.feature` files under `/features/` covering auth, game, and score persistence.
5. **Write step definitions** — Implement Given/When/Then steps using Playwright browser automation.
6. **Configure living documentation output** — Set up Cucumber HTML reporter or Playwright HTML report with Gherkin steps.
7. **Add test scripts to `package.json`** — `npm test` to run BDD suite, `npm run report` to generate/view docs.
8. **Create CI workflow** — New GitHub Actions workflow (e.g., `.github/workflows/bdd-tests.yml`) that installs dependencies, runs tests against the preview URL (or localhost), and uploads the HTML report as an artifact.
9. **Update README** — Document how to install, run tests, and view living documentation.
10. **Update `.gitignore`** — Add `node_modules/`, test output directories, Playwright cache.

## Definition of Done

- [ ] Open Questions #1–#5 answered by reviewer
- [ ] `package.json` exists with BDD framework and Playwright as dev dependencies
- [ ] Gherkin `.feature` files exist covering core auth, game, and score persistence behaviours
- [ ] Step definitions execute feature files via Playwright browser automation
- [ ] `npm test` (or equivalent) runs the BDD suite and produces pass/fail results
- [ ] An HTML living documentation report is generated after each test run
- [ ] The HTML report is browsable by feature/scenario with pass/fail status
- [ ] A GitHub Actions CI workflow runs tests and uploads the living documentation artifact
- [ ] `README.md` includes instructions for running tests and viewing living documentation
- [ ] Existing `verify-preview.yml` CI continues to pass
- [ ] No application code (`index.html`, `app.js`, `game.js`, `style.css`) is modified

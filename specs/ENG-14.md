# ENG-14 — BDD Tests Are All Failing in GitHub Actions

## Problem

All 8 BDD scenarios fail on every `deployment_status`-triggered CI run against the `main` branch. The workflow `.github/workflows/bdd-tests.yml` listens to `deployment_status` events without filtering by deployment source. When GitHub Pages deployments (from the `deploy-docs` job) fire `deployment_status` events, the workflow re-triggers itself and receives a GitHub Actions URL (e.g. `https://github.com/oscore-john/windsurf-hello-world-web/actions/runs/…`) as the `target_url` instead of a Vercel application URL. Playwright then navigates to a GitHub page that has no `#auth-screen` element, causing every test to fail.

This also creates a cascade: each merge to `main` produces multiple redundant and failing workflow runs from the GitHub Pages deployment events, in addition to the one correct run from the `push` event.

### Evidence

| Run ID | Event | Branch | BASE_URL | Result |
|---|---|---|---|---|
| 26076922463 | `push` | main | `https://windsurf-hello-world-web.vercel.app` | ✓ Success |
| 26076882396 | `deployment_status` | PR branch | `https://windsurf-hello-world-pdro8p0wq-john-gibbons-projects-ef44f997.vercel.app` | ✓ Success |
| 26076595281 | `deployment_status` | main | `https://github.com/oscore-john/…/actions/runs/26076574985/job/76668768276` | ✗ 8 failures |

Deployments on this repo come from two sources:
- **Vercel** (`creator: vercel[bot]`, `environment: Production` or `Preview`) — correct app URL
- **GitHub Pages** (`creator: oscore-john`, `environment: github-pages`) — GitHub Actions URL

## Goal

Make the BDD test workflow run only against Vercel deployments and the hardcoded production URL, so that all 8 BDD scenarios pass consistently in CI.

## Non-Goals

- Modifying the BDD test scenarios, step definitions, or Playwright configuration
- Changing the GitHub Pages deployment mechanism or the living documentation pipeline
- Fixing or refactoring the `verify-preview.yml` workflow (separate concern)
- Modifying application code (`index.html`, `app.js`, `game.js`, etc.)
- Addressing the Supabase test-account cleanup concern (separate ticket)

## Context

### Repository

`oscore-john/windsurf-hello-world-web`

### Architecture

- Static HTML/JS app deployed to **Vercel**
- Supabase Auth + database for user accounts and score persistence
- **playwright-bdd** for BDD tests (Gherkin → Playwright)
- GitHub Actions CI with two relevant workflows:
  - `bdd-tests.yml` — runs BDD tests and deploys living docs to GitHub Pages
  - `verify-preview.yml` — verifies Vercel preview deployments (already filters `environment != 'Production'`)

### Current Workflow Triggers (`bdd-tests.yml`)

```yaml
on:
  deployment_status:       # ← fires for ALL deployments (Vercel AND GitHub Pages)
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      base_url: ...
```

### Current URL Determination Logic

```yaml
- name: Determine base URL
  run: |
    if [ "${{ github.event_name }}" = "deployment_status" ]; then
      echo "base_url=${{ github.event.deployment_status.target_url }}" >> "$GITHUB_OUTPUT"
    elif [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
      echo "base_url=${{ inputs.base_url }}" >> "$GITHUB_OUTPUT"
    else
      echo "base_url=https://windsurf-hello-world-web.vercel.app" >> "$GITHUB_OUTPUT"
    fi
```

When a GitHub Pages `deployment_status` event fires, `github.event.deployment_status.target_url` is a GitHub Actions URL, not a Vercel app URL. The tests then navigate to GitHub's HTML and find no application elements.

### Cascade Effect

1. Merge to `main` → Vercel production deployment → `deployment_status` event → BDD tests run ✓
2. Same merge → `push` event → BDD tests run ✓ → `deploy-docs` job deploys to GitHub Pages
3. GitHub Pages deployment fires `deployment_status` event → BDD tests re-trigger with wrong URL → ✗ fail
4. Multiple cancelled/redundant runs due to concurrency group

## Assumptions

1. Vercel deployments always set `environment` to `Production` or `Preview`.
2. GitHub Pages deployments always set `environment` to `github-pages`.
3. No other deployment integrations are configured or planned for this repo.
4. The `push` trigger on `main` already correctly handles production BDD testing (hardcoded URL), so filtering out non-Vercel `deployment_status` events does not create a gap.
5. The `verify-preview.yml` workflow is a separate concern and does not need changes for this ticket (though it has a similar potential issue).

## Open Questions

None. The root cause is unambiguous and the fix is straightforward.

## Acceptance Criteria

1. **AC-1**: `deployment_status` events from GitHub Pages (`environment: github-pages`) do NOT trigger the `bdd-tests` job.
2. **AC-2**: `deployment_status` events from Vercel (`environment: Production` or `Preview`) continue to trigger the `bdd-tests` job with the correct Vercel `target_url`.
3. **AC-3**: The `push` trigger on `main` continues to work, using the hardcoded production URL.
4. **AC-4**: The `workflow_dispatch` trigger continues to work with the user-supplied URL.
5. **AC-5**: After the fix, no spurious/cascading BDD workflow runs occur when merging to `main`.
6. **AC-6**: All 8 BDD scenarios pass on `deployment_status`-triggered runs against Vercel URLs.

## BDD Scenarios

These scenarios describe the CI workflow behaviour, not the application behaviour. They are not meant to be added to the project's executable test suite but serve as verification criteria for the fix.

```gherkin
Feature: BDD CI workflow triggers correctly

  Scenario: Vercel preview deployment triggers BDD tests
    Given a pull request is opened against main
    When Vercel deploys a preview and fires a deployment_status event
    Then the bdd-tests job runs
    And BASE_URL is set to the Vercel preview URL
    And all 8 BDD scenarios pass

  Scenario: Vercel production deployment triggers BDD tests
    Given a commit is merged to main
    When Vercel deploys to production and fires a deployment_status event
    Then the bdd-tests job runs
    And BASE_URL is set to the Vercel production URL
    And all 8 BDD scenarios pass

  Scenario: GitHub Pages deployment does NOT trigger BDD tests
    Given a commit is merged to main
    And the deploy-docs job deploys living documentation to GitHub Pages
    When GitHub Pages fires a deployment_status event
    Then the bdd-tests job does NOT run

  Scenario: Push to main triggers BDD tests with production URL
    Given a commit is pushed to main
    When the push event triggers the workflow
    Then the bdd-tests job runs
    And BASE_URL is set to "https://windsurf-hello-world-web.vercel.app"
    And all 8 BDD scenarios pass

  Scenario: Manual workflow dispatch uses provided URL
    Given a user triggers the workflow manually
    When they provide a base_url input
    Then the bdd-tests job runs
    And BASE_URL is set to the user-provided URL
```

## Recommended Implementation

Add an environment filter to the `if` condition on the `bdd-tests` job in `.github/workflows/bdd-tests.yml`:

```yaml
jobs:
  bdd-tests:
    if: >-
      (github.event_name == 'deployment_status' &&
       github.event.deployment_status.state == 'success' &&
       github.event.deployment_status.environment != 'github-pages') ||
      github.event_name == 'push' ||
      github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
```

The key addition is `github.event.deployment_status.environment != 'github-pages'` which excludes GitHub Pages deployment events while allowing Vercel `Production` and `Preview` events through.

No changes are needed to the URL determination step, step definitions, feature files, or Playwright configuration.

### Alternative Approach (More Restrictive)

Instead of excluding `github-pages`, explicitly allow only Vercel environments:

```yaml
(github.event_name == 'deployment_status' &&
 github.event.deployment_status.state == 'success' &&
 (github.event.deployment_status.environment == 'Production' ||
  github.event.deployment_status.environment == 'Preview'))
```

This is safer if other non-Vercel deployment integrations might be added in the future, but is more brittle if Vercel changes its environment naming.

## Risks

| Risk | Category | Notes |
|---|---|---|
| Vercel changes environment naming | Autonomous-safe | Unlikely; `Production`/`Preview` are standard Vercel values. If changed, tests would simply stop triggering on `deployment_status` events, but `push` trigger provides fallback. |
| Another deployment integration is added later | Autonomous-safe | The exclusion approach (`!= 'github-pages'`) would pass unknown environments through. The allowlist approach would block them. |
| Existing cascade of in-progress/queued runs | Autonomous-safe | The concurrency group `pages` with `cancel-in-progress: false` may queue runs. After the fix, no new spurious runs will be queued. |

## Escalation Conditions

None identified. This is a low-risk, CI-only change that does not touch application code, database schemas, authentication, or financial logic.

## Definition of Done

- [ ] `bdd-tests.yml` updated with environment filter on the `if` condition
- [ ] PR merged to `main`
- [ ] Next merge to `main` produces exactly one successful `push`-triggered BDD run and one successful `deployment_status`-triggered BDD run (from Vercel), with no GitHub Pages-triggered runs
- [ ] All 8 BDD scenarios pass on both runs
- [ ] No cascading/spurious workflow runs observed

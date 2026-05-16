# ENG-3: Migrate to Vercel Hosting

## Problem

The site is currently hosted on Netlify, configured via `netlify.toml`. The intent is to migrate hosting to Vercel so the project is served from Vercel's edge network instead.

The repository is a simple static site (plain HTML + CSS, no build step) with a single `netlify.toml` that sets `publish = "."`. There is no framework, no package.json, and no server-side logic.

## Goal

Replace Netlify hosting with Vercel hosting so that:

- The site is deployed and served from Vercel.
- CI/CD (preview deploys on PRs, production deploy on `main`) is handled by Vercel.
- The old Netlify configuration is removed.

## Non-Goals

- Adding a build framework (Next.js, Vite, etc.) or changing the static-site nature of the project.
- Changing the site content, styling, or functionality.
- Custom domain configuration (can be a follow-up if needed).
- Migrating DNS records (out of scope unless the team decides to include it).

## Context

| Aspect | Current state |
|---|---|
| **Repo** | `oscore-john/windsurf-hello-world-web` |
| **Stack** | Static HTML + CSS (no build step) |
| **Hosting** | Netlify (`netlify.toml` with `publish = "."`) |
| **Branches** | `main` (production), one feature branch |
| **CI/CD** | No GitHub Actions workflows; Netlify handles deploy |

Vercel natively supports static sites with zero configuration. Connecting the GitHub repo to a Vercel project should be sufficient for deployments.

## Assumptions

1. The team has (or will create) a Vercel account/organization with access to the `oscore-john/windsurf-hello-world-web` GitHub repo.
2. The Netlify site can be decommissioned after Vercel is confirmed working.
3. No custom domain is currently in use (or domain migration will be handled separately).
4. No environment variables or secrets are required for this static site.

## Acceptance Criteria

1. **Vercel project exists** and is connected to `oscore-john/windsurf-hello-world-web`.
2. **Production deployment**: Pushes to `main` automatically deploy to Vercel and the site is accessible at the Vercel-assigned URL.
3. **Preview deployments**: Pull requests receive a unique Vercel preview URL with the latest changes.
4. **Site renders correctly**: `index.html` and `style.css` load without errors; the "Hello, world!" card displays identically to the current Netlify version.
5. **Netlify configuration removed**: `netlify.toml` is deleted from the repository.
6. **Netlify ignore added**: `.netlify/` entry in `.gitignore` is replaced (or supplemented) with `.vercel/`.
7. **Old Netlify site decommissioned**: The Netlify site/project is deleted or disabled (manual step, documented).

## BDD Scenarios

```gherkin
Feature: Vercel hosting migration

  Scenario: Production deploy on push to main
    Given the Vercel project is connected to the repository
    When a commit is pushed to the main branch
    Then Vercel builds and deploys the site automatically
    And the site is accessible at the Vercel production URL

  Scenario: Preview deploy on pull request
    Given the Vercel project is connected to the repository
    When a pull request is opened against main
    Then Vercel creates a preview deployment
    And a unique preview URL is posted to the pull request

  Scenario: Site renders correctly after migration
    Given the site is deployed on Vercel
    When a user visits the production URL
    Then the page title is "Hello World"
    And the heading "Hello, world!" is visible
    And the status badge "Live on the web" is visible
    And the CSS styles load without errors

  Scenario: Netlify configuration is cleaned up
    Given the migration to Vercel is complete
    Then the file netlify.toml no longer exists in the repository
    And .gitignore contains ".vercel/" instead of ".netlify/"
```

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Vercel account/org not yet provisioned** | Medium | Confirm access before starting implementation. |
| **Custom domain tied to Netlify DNS** | Low | Check if a custom domain exists; if so, plan DNS migration separately. |
| **Netlify site still receiving traffic after migration** | Low | Add a redirect or decommission Netlify site promptly after verification. |
| **GitHub App permissions** | Low | Vercel's GitHub integration needs repo access; may require org admin approval for `oscore-john`. |

## Escalation Conditions

- If a custom domain is currently pointing to Netlify, DNS migration must be coordinated and may require downtime planning.
- If the Vercel GitHub integration cannot be installed on the `oscore-john` GitHub account, org admin intervention is needed.

## Implementation Path

1. Connect the repo to a Vercel project (via Vercel dashboard or CLI).
2. Verify production deploy from `main` and preview deploy from a test PR.
3. Remove `netlify.toml` from the repo.
4. Update `.gitignore`: replace `.netlify/` with `.vercel/`.
5. Decommission the Netlify site (manual, outside the repo).

## Definition of Done

- [ ] Vercel project is live and auto-deploys from `main`.
- [ ] Preview deployments work on PRs.
- [ ] Site content renders identically to the Netlify version.
- [ ] `netlify.toml` removed from repository.
- [ ] `.gitignore` updated.
- [ ] Netlify site decommissioned (or documented for manual teardown).

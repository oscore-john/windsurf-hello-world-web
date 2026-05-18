# ENG-9: Ensure Migrations Are Run When Merge to Main

## Problem

The `windsurf-hello-world-web` project uses Supabase as its backend (auth + database). Database schema changes are managed via Supabase migration files in `supabase/migrations/`. Currently there is one migration (`20260517105913_create_scores_table.sql`) that creates the `scores` table with RLS policies.

There is **no automated mechanism** to apply these migrations to the production Supabase database when code is merged to `main`. If a developer adds a new migration file and merges it, the production database schema will not be updated until someone manually runs `supabase db push` or applies the migration through the Supabase dashboard. This creates a gap where the deployed application code references schema objects that do not yet exist in production.

## Goal

Add a GitHub Actions workflow that automatically runs Supabase migrations against the production database whenever a push to `main` includes changes in the `supabase/migrations/` directory. This ensures the production database schema stays in sync with the codebase.

## Non-Goals

- **Modifying application code** (`index.html`, `app.js`, `game.js`, `style.css`) -- no functional changes to the site itself.
- **Local development database management** -- this ticket covers production CI/CD only.
- **Migration rollback automation** -- rollbacks are a manual, safety-critical operation and should not be automated without explicit human review.
- **Adding a migration generation workflow** -- creating new migration files remains a developer responsibility.
- **Preview/staging database environments** -- running migrations against per-PR preview databases is out of scope. Only the production database on merge to `main`.
- **Changing the existing `verify-preview.yml` workflow** -- that workflow is unrelated and should not be modified.

## Context

### Repository State

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS, Supabase backend |
| Hosting | Vercel (auto-deploys from `main`) |
| CI/CD | `verify-preview.yml` (Vercel preview deployment smoke tests) |
| Database | Supabase (PostgreSQL), project ref `vyjswambsfbpebkwbwcx` |
| Supabase config | `supabase/config.toml` (project_id: `windsurf-hello-world`) |
| Existing migrations | `supabase/migrations/20260517105913_create_scores_table.sql` |
| Existing migration CI | None |

### How Supabase CLI Migrations Work in CI

The Supabase CLI provides `supabase db push` which:

1. Connects to the remote Supabase project.
2. Compares the local `supabase/migrations/` directory against the remote `supabase_migrations` tracking table.
3. Applies any pending migrations in timestamp order.
4. Is **idempotent** -- already-applied migrations are skipped.

Required environment variables:

| Variable | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Authenticates the Supabase CLI against the Supabase Management API |
| `SUPABASE_DB_PASSWORD` | The database password for the Supabase project (needed by `supabase db push`) |

The project ref (`vyjswambsfbpebkwbwcx`) can either be passed via `supabase link --project-ref` or stored in configuration.

### Existing Workflow

The only existing workflow is `verify-preview.yml`, triggered on `deployment_status`. It verifies Vercel preview deployments using a bypass secret. This workflow is unrelated to database migrations and should not be modified.

## Assumptions

1. **The Supabase project at `vyjswambsfbpebkwbwcx` is the production database.** The anon key and URL in `app.js` point to this project, and it is the only Supabase project referenced in the codebase.

2. **`supabase db push` is the correct command for applying migrations in CI.** This is the Supabase-recommended approach for CI/CD pipelines (as opposed to `supabase migration up`, which targets a local database).

3. **The workflow should run on every push to `main`**, not just when migration files change. This is safer because it ensures the database is always in sync, even if a migration was added in a prior commit that wasn't properly applied. The `supabase db push` command is idempotent, so running it when there are no pending migrations is a no-op.

4. **GitHub Actions secrets can be configured for this repository.** The repo owner (`oscore-john`) has permission to add repository secrets.

5. **The Supabase CLI can be installed in CI via the official GitHub Action** (`supabase/setup-cli`).

## Open Questions

> These require human decision before implementation proceeds.

1. **Are the required secrets already configured as GitHub Actions secrets?**
   - `SUPABASE_ACCESS_TOKEN` -- a Supabase personal access token or service token with permission to manage the project.
   - `SUPABASE_DB_PASSWORD` -- the database password for the `vyjswambsfbpebkwbwcx` project.
   - If not, these need to be provisioned and added to the repo's GitHub Actions secrets before the workflow will function.

2. **Should the workflow run on every push to `main`, or only when `supabase/migrations/` files change?**
   - **Option A (recommended): Every push to `main`.** Simpler, more reliable. `supabase db push` is idempotent, so there is no cost to running it when no migrations are pending. Avoids edge cases where a migration file is added in a merge commit that doesn't trigger the path filter.
   - **Option B: Only when `supabase/migrations/**` changes.** Uses a `paths` filter on the workflow trigger. Reduces unnecessary CI runs but risks missing migrations in certain merge scenarios.

3. **Should the workflow also run `supabase db push` with `--dry-run` on pull requests** (as a safety check before merge)? This would show what migrations *would* be applied without actually applying them. This is a potential enhancement but adds scope.

## Acceptance Criteria

1. **A GitHub Actions workflow file exists** at `.github/workflows/migrate.yml` (or similar name) in the repository.

2. **The workflow triggers on push to `main`** (i.e., when a PR is merged or a direct push occurs).

3. **The workflow installs the Supabase CLI**, links to the production project (`vyjswambsfbpebkwbwcx`), and runs `supabase db push` to apply any pending migrations.

4. **The workflow uses GitHub Actions secrets** for `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` -- no credentials are hardcoded in the workflow file.

5. **The workflow fails the CI job if migration application fails**, providing clear error output for debugging.

6. **The workflow succeeds (green check) when there are no pending migrations** -- the idempotent `supabase db push` exits with code 0 when nothing needs to be applied.

7. **Existing CI (`verify-preview.yml`) is unaffected** -- no changes to the existing workflow.

## BDD Scenarios

```gherkin
Feature: Automatic Supabase migration on merge to main

  Background:
    Given the GitHub repository "oscore-john/windsurf-hello-world-web"
    And the repository has GitHub Actions secrets "SUPABASE_ACCESS_TOKEN" and "SUPABASE_DB_PASSWORD" configured
    And the Supabase project "vyjswambsfbpebkwbwcx" is the production database

  Scenario: New migration is applied on merge to main
    Given a developer creates a new migration file in "supabase/migrations/"
    And the migration has not yet been applied to the production database
    When the developer's PR is merged to main
    Then the "migrate" GitHub Actions workflow runs
    And the Supabase CLI applies the pending migration to the production database
    And the workflow completes with a success status

  Scenario: No pending migrations results in a successful no-op
    Given all migrations in "supabase/migrations/" have already been applied to the production database
    When a commit is pushed to main (with no new migration files)
    Then the "migrate" workflow runs
    And the Supabase CLI reports no pending migrations
    And the workflow completes with a success status

  Scenario: Migration failure causes workflow to fail
    Given a migration file in "supabase/migrations/" contains invalid SQL
    When the developer's PR is merged to main
    Then the "migrate" workflow runs
    And the Supabase CLI attempts to apply the migration
    And the migration fails due to the SQL error
    And the workflow completes with a failure status
    And the error output is visible in the GitHub Actions logs

  Scenario: Secrets are not exposed in logs
    Given the workflow uses "SUPABASE_ACCESS_TOKEN" and "SUPABASE_DB_PASSWORD" from GitHub secrets
    When the workflow runs
    Then the secret values are masked in all workflow log output

  Scenario: Existing verify-preview workflow is unaffected
    Given the "verify-preview.yml" workflow exists
    When the "migrate" workflow is added
    Then the "verify-preview.yml" workflow continues to trigger on deployment_status events
    And the "verify-preview.yml" workflow behaviour is unchanged
```

## Risks

### Human-Review-Required

1. **Database credentials in CI.** The workflow requires `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` as GitHub Actions secrets. These are sensitive credentials that grant write access to the production database schema. A human must provision and store these secrets. *(Escalation Boundary #5 -- safety-critical credentials.)*

2. **Migrations run against the production database automatically.** Once this workflow is in place, any migration file merged to `main` will be applied to production without manual review at the point of application. The review gate shifts to the PR review process -- reviewers must carefully inspect migration files before approving merges. This is standard CI/CD practice but represents a change in the team's deployment model. *(Escalation Boundary #5 -- production data integrity.)*

3. **No rollback automation.** If a migration causes an issue in production, there is no automated rollback. The team must manually intervene (e.g., write a corrective migration, restore from backup, or use `supabase db reset` in extreme cases). This is intentionally out of scope but should be acknowledged.

### Autonomous-Safe

4. **Workflow file creation.** Adding a new `.github/workflows/migrate.yml` file is a standard, low-risk operation. It does not modify any existing code or workflows.

5. **Supabase CLI installation in CI.** The official `supabase/setup-cli` GitHub Action is well-maintained and widely used. Installation is straightforward.

6. **Idempotent execution.** `supabase db push` is idempotent -- running it multiple times or when no migrations are pending is safe and produces no side effects.

### Blocking

7. **GitHub Actions secrets must be configured.** The workflow will fail on its first run if `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are not set as repository secrets. This is a prerequisite that must be completed by a human with repo admin access. *(Escalation Boundary #6 -- insufficient access.)*

## Escalation Conditions

- If the Supabase access token or database password cannot be provisioned, escalate to the repo owner (`oscore-john`) to configure GitHub Actions secrets.
- If the team wants migration dry-runs on PRs (Open Question #3), that expands scope and should be shaped as a follow-up ticket.
- If the team wants migrations to also run against a staging/preview database, that is a separate concern requiring a different architecture (e.g., Supabase branching).

## Proposed Workflow Structure

> Draft workflow for the implementing agent. Final structure subject to review.

```yaml
name: Run Supabase Migrations

on:
  push:
    branches:
      - main

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link Supabase project
        run: supabase link --project-ref vyjswambsfbpebkwbwcx
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Push migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

## Definition of Done

- [ ] Open Questions #1-#3 answered by reviewer
- [ ] GitHub Actions secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` configured on the repository
- [ ] `.github/workflows/migrate.yml` (or equivalent) exists and triggers on push to `main`
- [ ] Workflow installs Supabase CLI, links to project, and runs `supabase db push`
- [ ] Workflow succeeds when no pending migrations exist (idempotent)
- [ ] Workflow applies pending migrations when new migration files are merged
- [ ] Workflow fails with clear output when a migration contains errors
- [ ] No credentials are hardcoded in workflow files
- [ ] Existing `verify-preview.yml` workflow is unaffected
- [ ] PR reviewed and merged to `main`

# ENG-8: Convert to Using Supabase Migrations

## Problem

The `windsurf-hello-world-web` project uses a Supabase backend (project ref `vyjswambsfbpebkwbwcx`) for authentication and score persistence. The database schema — a single `scores` table with RLS policies — was created manually via the Supabase dashboard. There are **zero tracked migrations** in the Supabase project and **no `supabase/` directory** in the repository.

This means:

- **No version control** over the database schema. Changes are invisible in Git history.
- **No reproducibility.** A new developer, branch database, or fresh Supabase project cannot be set up from the repo alone.
- **No PR-based review flow.** Schema changes bypass code review entirely.
- **No integration with Supabase branching.** Supabase automatically creates preview branch databases when it detects changes in a `/supabase` folder on PR branches — this workflow is currently unavailable.

## Goal

Introduce a `supabase/` directory with migration files that codify the **existing** production schema, enabling:

1. The database schema to be version-controlled alongside application code.
2. New environments (branch databases, local dev) to be bootstrapped from migrations alone.
3. Future schema changes to follow a migration-based PR workflow where Supabase automatically provisions branch databases for PRs that touch `supabase/`.

## Non-Goals

- **Changing the existing schema.** This ticket captures the current schema as-is; no columns, tables, or policies are added, removed, or modified.
- **Adding new features or tables.** Future schema evolution is out of scope.
- **Setting up Supabase CLI for local development** (e.g., `supabase start` with Docker). Local dev tooling is a follow-up concern.
- **Migrating to a different Supabase project or region.**
- **Changing application code** (`app.js`, `game.js`, etc.). The app continues to work identically.
- **Introducing a build step, `package.json`, or bundler.**

## Context

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS; Supabase JS SDK via CDN |
| Hosting | Vercel (static deployment) |
| Supabase project | `vyjswambsfbpebkwbwcx` ("windsurf-hello-world") |
| Supabase org | `zgqsnmdxtgxyrorokrlh` |
| CI/CD | GitHub Actions `verify-preview.yml` (preview deployment smoke tests) |
| Existing migrations | None (empty migration list) |

### Current Database Schema (Production)

**Table: `public.scores`**

| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `user_id` | `uuid` | NO | — | PRIMARY KEY, FOREIGN KEY to `auth.users(id)` |
| `score` | `integer` | NO | `0` | — |
| `best` | `integer` | NO | `0` | — |
| `updated_at` | `timestamptz` | NO | `now()` | — |

**RLS: Enabled**

| Policy Name | Command | Condition |
|---|---|---|
| Users can read own score | SELECT | `auth.uid() = user_id` |
| Users can insert own score | INSERT | `auth.uid() = user_id` (WITH CHECK) |
| Users can update own score | UPDATE | `auth.uid() = user_id` |

### How the App Uses the Schema

- `app.js` calls `supabase.from("scores").select("score, best").eq("user_id", userId).maybeSingle()` to load the current score and best score.
- `app.js` calls `supabase.from("scores").upsert({ user_id, score, best }, { onConflict: "user_id" })` to save scores (debounced, every 2 seconds).
- Authentication uses Supabase Auth (email/password sign-up, sign-in, sign-out, session persistence).

## Assumptions

1. **The existing production schema is the source of truth.** The migration must reproduce the exact current schema (table, columns, types, defaults, constraints, RLS policies) — not a modified or "improved" version.

2. **The Supabase project already has the `supabase_migrations` schema tracking applied migrations.** When migrations are applied via the Supabase MCP or CLI, they are recorded in `supabase_migrations.schema_migrations`. Since no migrations have been applied yet, applying the baseline migration will be the first recorded entry.

3. **The `supabase/config.toml` file should use standard Supabase CLI conventions.** This enables future local development and is required for the Supabase GitHub integration to detect the `supabase/` folder.

4. **The initial migration should be idempotent where practical** (using `IF NOT EXISTS` guards) so it can be safely applied to the existing production database without errors, even though the table already exists.

5. **No data migration or backfill is needed.** The schema is being captured, not transformed.

6. **The Supabase anon key hardcoded in `app.js` is acceptable for now.** Moving it to environment variables is a separate concern.

## Open Questions

1. **Should the baseline migration be applied to the existing production project via the Supabase MCP `apply_migration` tool, or only committed to the repo for future use?**
   - **Option A (Recommended):** Apply it so the production project's migration history is in sync with the repo. This means Supabase branching will work correctly (branches inherit the migration history from production).
   - **Option B:** Commit only; apply manually later. This is safer but means branch databases won't work until it's applied.

2. **Should a `supabase/config.toml` be included, or just the `migrations/` directory?**
   - Including `config.toml` is standard practice and enables the Supabase CLI and GitHub integration. Recommended to include it with the project ref configured.

3. **Should the Supabase GitHub Integration be enabled on this repo?**
   - Enabling it would allow automatic preview branch databases on PRs that change `supabase/` files. This is the workflow described in team knowledge. However, enabling the integration is an admin action outside the scope of this code change — it should be flagged as a follow-up step.

## Acceptance Criteria

1. **A `supabase/` directory exists at the repo root** containing at minimum a `config.toml` and a `migrations/` subdirectory.

2. **A baseline migration file exists** at `supabase/migrations/<timestamp>_create_scores_table.sql` that, when applied to a fresh Supabase project, produces the exact current production schema:
   - `public.scores` table with columns `user_id` (uuid PK, FK to `auth.users(id)`), `score` (integer, default 0), `best` (integer, default 0), `updated_at` (timestamptz, default `now()`).
   - RLS enabled on `scores`.
   - Three RLS policies: SELECT, INSERT, UPDATE — all scoped to `auth.uid() = user_id`.

3. **The migration SQL is idempotent** — using `CREATE TABLE IF NOT EXISTS` and `CREATE POLICY ... IF NOT EXISTS` (or `DO $$ ... $$` blocks) so it can be applied to the existing production database without failing on "already exists" errors.

4. **The `supabase/config.toml` references the correct project** (ref `vyjswambsfbpebkwbwcx`).

5. **No application code is changed.** `index.html`, `app.js`, `game.js`, `style.css`, and `works.js` remain identical.

6. **No regressions.** The existing CI workflow (`verify-preview.yml`) continues to pass.

7. **The `.gitignore` is updated** if needed to exclude any Supabase CLI local artifacts (e.g., `.supabase/` directory used by `supabase start`).

## BDD Scenarios

```gherkin
Feature: Supabase migration baseline

  Scenario: Baseline migration reproduces the scores table
    Given a fresh Supabase project with no tables in the public schema
    When the baseline migration file is applied
    Then a "scores" table exists in the public schema
    And it has columns: user_id (uuid), score (integer), best (integer), updated_at (timestamptz)
    And user_id is the primary key
    And user_id references auth.users(id)
    And score has a default of 0
    And best has a default of 0
    And updated_at has a default of now()

  Scenario: Baseline migration enables RLS with correct policies
    Given a fresh Supabase project with no tables in the public schema
    When the baseline migration file is applied
    Then RLS is enabled on the "scores" table
    And a SELECT policy exists allowing users to read rows where auth.uid() = user_id
    And an INSERT policy exists allowing users to insert rows where auth.uid() = user_id
    And an UPDATE policy exists allowing users to update rows where auth.uid() = user_id

  Scenario: Baseline migration is idempotent on existing production database
    Given the production Supabase project with the scores table already present
    When the baseline migration file is applied
    Then no errors occur
    And the existing table, data, and policies remain intact

  Scenario: Repository contains Supabase configuration
    Given the repository has been cloned
    Then a supabase/config.toml file exists
    And it contains the project ref "vyjswambsfbpebkwbwcx"
    And a supabase/migrations/ directory exists with at least one .sql file

  Scenario: Application continues to work after migration adoption
    Given the migration has been applied to the production project
    When a user signs in and plays the game
    Then scores are saved and loaded correctly
    And the app behaves identically to before the migration was introduced

Feature: Supabase branching workflow (future validation)

  Scenario: PR with migration changes triggers branch database
    Given the Supabase GitHub integration is enabled on the repo
    When a PR is opened that adds a new file under supabase/migrations/
    Then Supabase creates a preview branch database for the PR
    And the branch database has all migrations applied
```

## Risks

### Autonomous-Safe

1. **Creating the `supabase/` directory and migration files.** This is purely additive — new files in the repo. No existing code is modified. Low risk.

2. **Updating `.gitignore`.** Adding `.supabase/` to the ignore list is standard practice and non-destructive.

3. **Creating `config.toml`.** Standard Supabase CLI configuration file. Non-destructive.

### Human-Review-Required

4. **Applying the baseline migration to production via `apply_migration`.** Although the migration should be idempotent (`IF NOT EXISTS`), applying anything to the production database warrants human sign-off. The migration does not alter existing data or schema, but it does write to the `supabase_migrations.schema_migrations` tracking table, which affects how Supabase branching behaves going forward. *(Escalation Boundary #5 — production database change.)*

5. **Enabling the Supabase GitHub Integration.** This is an admin action on the Supabase dashboard that connects the repo to automatic branch database provisioning. It should be done by a team member with org admin access after the migration files are merged. *(Escalation Boundary #6 — external system configuration.)*

### Blocking

None. All information needed for shaping is available.

## Escalation Conditions

- If the team decides the baseline migration should **not** use `IF NOT EXISTS` guards (preferring a strict "only run on fresh databases" approach), the idempotency acceptance criterion must be revised.
- If the Supabase project has been modified since this spec was written (e.g., new columns or policies added manually), the migration must be updated to reflect the current state before being applied.
- If the team wants to introduce local Supabase development (`supabase start` with Docker), that is a separate scope expansion and should be a follow-up ticket.

## Proposed File Structure

```
supabase/
  config.toml
  migrations/
    20260518000000_create_scores_table.sql
```

### `supabase/config.toml` (minimal)

```toml
[api]
enabled = true
port = 54321

[db]
port = 54322

[studio]
enabled = true
port = 54323
```

> Note: The `config.toml` primarily configures local dev via `supabase start`. The project ref linkage for the GitHub integration is configured in the Supabase dashboard, not in `config.toml`. The file is included to establish the conventional directory structure.

### `supabase/migrations/20260518000000_create_scores_table.sql`

```sql
-- Baseline migration: captures the existing production schema for the scores table.
-- This migration is idempotent and safe to apply to the existing production database.

CREATE TABLE IF NOT EXISTS public.scores (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  score integer NOT NULL DEFAULT 0,
  best integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Users can read own score'
  ) THEN
    CREATE POLICY "Users can read own score" ON public.scores
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Users can insert own score'
  ) THEN
    CREATE POLICY "Users can insert own score" ON public.scores
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Users can update own score'
  ) THEN
    CREATE POLICY "Users can update own score" ON public.scores
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
```

## Implementation Path

1. **Create `supabase/config.toml`** with standard local dev configuration.
2. **Create `supabase/migrations/20260518000000_create_scores_table.sql`** with the idempotent baseline migration capturing the exact current production schema.
3. **Update `.gitignore`** to exclude `.supabase/` (local CLI state directory).
4. **Open a PR** for review.
5. **After PR approval and merge:** Apply the baseline migration to the production Supabase project via `apply_migration` so the migration history is in sync. *(Requires human sign-off — see Risk #4.)*
6. **Follow-up (separate ticket):** Enable the Supabase GitHub Integration on the repo to activate automatic branch database provisioning for future PRs.

## Definition of Done

- [ ] `supabase/config.toml` exists with standard configuration
- [ ] `supabase/migrations/<timestamp>_create_scores_table.sql` exists and reproduces the exact production schema
- [ ] Migration SQL is idempotent (safe to apply on existing production DB)
- [ ] `.gitignore` updated to exclude `.supabase/`
- [ ] No application code modified
- [ ] Existing CI (`verify-preview.yml`) passes
- [ ] PR reviewed and approved by a human
- [ ] (Post-merge) Baseline migration applied to production Supabase project
- [ ] (Follow-up) Supabase GitHub Integration enabled on the repo

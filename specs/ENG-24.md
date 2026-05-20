# ENG-24: Track Number of Games Played by a User

## Problem

The click-the-button game currently tracks only the running score and best (high) score in the Supabase `scores` table. There is no record of how many times a user has played. The ticket requests tracking the number of games played per user so this metric is persisted and visible.

## Goal

Add a `games_played` counter to the existing `scores` table and increment it each time a user starts a new game session. Display the count in the game UI header alongside the existing Score and Best displays.

## Non-Goals

- Adding a time-limited round mechanic (e.g. 60-second rounds with explicit start/end).
- Leaderboards or public visibility of games-played counts across users.
- Changing the core game loop, scoring logic, or button mechanics.
- Modifying authentication, sign-up/sign-in, or account-deletion flows.
- Resetting the games-played counter (no reset mechanism in scope).

## Context

| Aspect | Current state |
|---|---|
| **Repo** | `oscore-john/windsurf-hello-world-web` |
| **Stack** | Next.js 15 App Router, TypeScript, Supabase (auth + DB), Vercel |
| **Game logic** | `src/lib/game-engine.ts` — module exposing `start()`, `stop()`, `getScore()` |
| **Score persistence** | `src/components/GameScreen.tsx` — loads score on mount, upserts to `scores` table on changes and before unload |
| **Database** | Single `scores` table: `user_id` (PK, FK → auth.users), `score`, `best`, `updated_at`. RLS enabled — users can only read/write own row. |
| **Game lifecycle** | Game starts automatically on page load after auth. No explicit "start game" / "end game" boundary — the session is continuous. |
| **Existing BDD** | `features/game.feature`, `features/score-persistence.feature` cover scoring, button mechanics, and score persistence |

### Key code references

**`supabase/migrations/20260517105913_create_scores_table.sql` — current schema:**
```sql
create table public.scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null default 0,
  best integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint scores_pkey primary key (user_id)
);
```

**`src/components/GameScreen.tsx` — score load on mount:**
```typescript
supabase
  .from('scores')
  .select('score, best')
  .eq('user_id', user.id)
  .maybeSingle()
  .then(({ data }) => {
    const currentScore = data?.score || 0;
    const best = data?.best || 0;
    // ... set state and start game
    Game.start(area, currentScore, onScoreChange);
  });
```

**`src/components/GameScreen.tsx` — score upsert on change:**
```typescript
supabase
  .from('scores')
  .upsert(
    { user_id: user.id, score: s, best: b },
    { onConflict: 'user_id' },
  )
```

## Assumptions

1. **A "game" = a page-load session.** Since the game has no explicit start/end round mechanic, each time the GameScreen mounts and `Game.start()` is called counts as one game played. Refreshing the page or signing out and back in each count as a new game.
2. **The counter is persisted in the existing `scores` table** as a new `games_played` column rather than a separate table. This keeps the schema simple — one row per user with all their stats.
3. **The counter is incremented atomically on the server** using a Supabase RPC function (Postgres function) to avoid race conditions from concurrent tabs. The function performs `games_played = games_played + 1` rather than reading and writing from the client.
4. **The count is displayed in the game header** alongside Score and Best, using the same styling conventions.
5. **No changes to existing RLS policies** — the games-played count follows the same per-user read/write model as score and best.
6. **The counter only increments** — there is no mechanism to decrement or reset it.

## Open Questions

None — the feature is a straightforward counter addition to an existing table with a clear definition of "game session" (page-load lifecycle). The Supabase migration, RPC function, and frontend changes are all well-defined.

## Acceptance Criteria

1. **Schema change**: The `scores` table has a new `games_played integer not null default 0` column.
2. **Atomic increment**: A Supabase RPC function (e.g. `increment_games_played`) atomically increments `games_played` by 1 for the authenticated user, inserting the row if it does not exist (upsert semantics).
3. **Increment on session start**: Each time the GameScreen component mounts and the game initialises, the `games_played` counter is incremented exactly once.
4. **No double-counting**: Rapid re-renders or React strict-mode double-mounts do not cause extra increments. The increment should be guarded (e.g. via a ref flag or by being placed outside the effect that could re-fire).
5. **Display in header**: The games-played count is visible in the game header (e.g. "Played: **N**") alongside the existing Score and Best displays.
6. **Persistence**: The games-played count survives sign-out and sign-in — signing back in shows the accumulated count.
7. **Score upsert compatibility**: The existing score/best upsert continues to work correctly with the new column present (the upsert should not reset `games_played` to 0).
8. **No auth regression**: Sign-in, sign-up, sign-out, and account-deletion flows remain unaffected. Account deletion cascades and removes the scores row (including games_played) as before.

## BDD Scenarios

```gherkin
Feature: Track number of games played

  The game tracks how many sessions a user has played.
  The count increments each time the game screen loads and
  persists across sign-out / sign-in cycles.

  Background:
    Given the user is signed in and on the game screen

  Scenario: Games played counter is visible in the header
    Then the games played count is displayed in the game header

  Scenario: Games played increments on game session start
    Given the user has played 0 games previously
    When the game screen loads
    Then the games played count shows 1

  Scenario: Games played increments on each new session
    Given the user has played N games previously
    When the user refreshes the page
    Then the games played count shows N + 1

  Scenario: Games played persists after sign-out and sign-in
    Given the user has played several game sessions
    When the user signs out
    And signs back in with the same credentials
    Then the games played count reflects all previous sessions

  Scenario: Games played does not increment on score update
    Given the user is on the game screen
    When the user clicks a target button
    Then the games played count does not change

  Scenario: Account deletion removes games played data
    Given the user has played several game sessions
    When the user deletes their account
    And creates a new account with the same email
    Then the games played count starts at 0
```

## Risks

### Autonomous-safe

- **Single-column migration**: Adding a `NOT NULL DEFAULT 0` column to the `scores` table is a safe, non-destructive operation. Existing rows get the default value. No data loss.
- **RPC function creation**: Adding a new Postgres function is additive and does not affect existing queries or policies.
- **Frontend display change**: Adding a counter to the header is a low-risk UI addition following existing patterns.

### Human-review-required

- **Upsert compatibility**: The existing `saveScore` function upserts `{ user_id, score, best }`. After adding the `games_played` column, this upsert must NOT include `games_played` in the payload (otherwise it would reset to 0 or the default on every save). The reviewer should verify that the upsert only touches `score` and `best` and leaves `games_played` unchanged. This is the current behaviour (the upsert only specifies `score` and `best`), but it should be explicitly verified after the migration.
- **React strict-mode double-mount**: In development, React 18+ strict mode mounts components twice. The increment guard must be tested to ensure it does not double-count in dev mode.

### Blocking

- None identified.

## Escalation Conditions

- If the team wants "games played" to mean something other than "page-load sessions" (e.g. time-limited rounds), this changes the scope significantly and requires a product decision.
- If the team wants the games-played count to be publicly visible (leaderboard, other users' profiles), the RLS policies would need modification — this should be a separate ticket.
- If the team wants to track game session duration or other session metadata, a separate `game_sessions` table would be more appropriate — out of scope for this ticket.

## Definition of Done

1. Supabase migration adds `games_played integer not null default 0` to the `scores` table.
2. A Supabase RPC function `increment_games_played` atomically increments the counter for the calling user (with upsert semantics for new users).
3. `GameScreen.tsx` calls `increment_games_played` once on mount, guarded against double-invocation.
4. The game header displays the games-played count using the existing header styling.
5. Existing score persistence and upsert logic continues to work without resetting `games_played`.
6. BDD scenarios for games-played tracking are added to a new feature file (e.g. `features/games-played.feature`).
7. All existing BDD tests continue to pass.
8. TypeScript compiles without errors (`npm run typecheck`).
9. Visual verification on Vercel preview confirms the counter displays and increments correctly.

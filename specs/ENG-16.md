# ENG-16: Multiple Target Buttons

## Problem

The "Click the Button!" game currently presents a single target button that moves to a random position every second. The player clicks it to increment their score. The ticket requests enhancing the game so that **multiple target buttons appear simultaneously** instead of just one, increasing the challenge and engagement of the gameplay.

## Goal

Refactor the game to spawn and manage multiple target buttons in the game area simultaneously. Each button is independently clickable, independently repositioned, and contributes to the player's score on click. The rest of the application (auth, score persistence, account deletion) is unaffected.

## Non-Goals

- Changing authentication flow or UI.
- Changing score persistence logic (Supabase `scores` table schema, save/load behaviour).
- Adding difficulty levels, configurable button counts, or settings UI.
- Changing the visual theme, colour palette, or overall layout.
- Adding new scoring mechanics (e.g. combo bonuses, time penalties, different point values per button).
- Modifying the account deletion flow.
- Changing deployment or CI configuration.

## Context

| Aspect | Current state |
|---|---|
| **Repo** | `oscore-john/windsurf-hello-world-web` |
| **Stack** | Static HTML + CSS + vanilla JS; Supabase auth; deployed on Vercel |
| **Game logic** | `game.js` — IIFE module exposing `Game.start()`, `Game.stop()`, `Game.getScore()` |
| **App wiring** | `app.js` — references `#target-btn` in `showGame()` to reset label |
| **HTML** | `index.html` line 50 — single `<button class="target-btn" id="target-btn">0</button>` inside `#game-area` |
| **CSS** | `style.css` — `.target-btn` class (lines 197–220) already styles by class, not ID |
| **Existing BDD** | `features/game.feature` — three scenarios referencing `#target-btn` |
| **BDD step defs** | `features/steps/game.steps.ts` — locators use `#target-btn` |

### Current Single-Button Architecture

1. **HTML**: One static `<button>` with `id="target-btn"` inside `<main id="game-area">`.
2. **game.js**: Captures `btn = document.getElementById("target-btn")` at module load. `moveButton()` repositions this single element. Click handler on `btn` increments `score` and calls `moveButton()`. `setInterval(moveButton, 1000)` auto-moves it.
3. **app.js**: `showGame()` resets `document.getElementById("target-btn").textContent = "0"`.
4. **CSS**: `.target-btn` is styled with `position: absolute`, `width: 5rem`, `height: 5rem`, border-radius 50% (circle), glow effects, and hover/active transforms.

### Impact of Multi-Button Change

| File | Change required |
|---|---|
| `index.html` | Remove the static `#target-btn` element; buttons will be created dynamically by JS |
| `game.js` | Major refactor: manage an array of button elements, each with independent position and movement interval |
| `app.js` | Remove the `document.getElementById("target-btn").textContent = "0"` line in `showGame()`; `Game.start()` now handles all button creation |
| `style.css` | No changes expected — `.target-btn` class already works for multiple elements |
| `features/game.feature` | Update scenarios to account for multiple buttons |
| `features/steps/game.steps.ts` | Update locators from `#target-btn` to `.target-btn` (class-based); adapt assertions for multi-button context |

## Assumptions

1. **Button count is fixed at 3.** The game spawns exactly three target buttons simultaneously. This is a reasonable default for increased challenge without overwhelming the player. If a different count is desired, the implementation should use a constant that is easy to change.
2. **Each button is an independent click target.** Clicking any of the three buttons increments the shared score by 1.
3. **Each button moves independently on its own interval.** All buttons reposition every 1 second (same `MOVE_DELAY_MS` as today), but staggered so they don't all move at the same instant.
4. **Buttons do not display the score.** With multiple buttons, displaying the score on each button is visually noisy. Instead, buttons display no text or a simple icon/dot. The score is shown only in the header (which already exists). If the current behaviour of showing the score on the button is preferred, only one "primary" button would show it — but this assumption favours removing it from all buttons for cleanliness.
5. **Buttons are created dynamically by JavaScript** rather than being hard-coded in HTML. This keeps the HTML clean and makes the button count easy to change.
6. **Buttons do not overlap.** When repositioning, each button should be placed so it does not overlap with other buttons. A simple collision-avoidance check is sufficient.
7. **All buttons share the same size and style.** No visual differentiation between buttons (they all use `.target-btn` styling with random colours as today).
8. **Score persistence is unchanged.** The total score (across all button clicks) is saved to Supabase exactly as today.

## Open Questions

> These require human decision before implementation can proceed.

### OQ-1: How many buttons should appear?

This spec assumes **3** as a reasonable default. Should it be a different number? Should the number increase over time as difficulty scaling?

**Recommendation:** Start with a fixed count of 3. Difficulty scaling can be a follow-up ticket.

### OQ-2: Should buttons display the score?

Currently the single button shows the running score. With multiple buttons this becomes ambiguous — which button shows the score? Options:

- **A) No button shows the score** — score is only visible in the header. *(Assumed default)*
- **B) All buttons show the same score** — every button label updates on every click.
- **C) Each button shows its own click count** — buttons track individual contribution.

**Recommendation:** Option A (no score on buttons) is cleanest. The header already displays the score prominently.

### OQ-3: Should buttons move in sync or staggered?

- **A) Staggered** — each button moves on its own offset timer, creating more dynamic gameplay. *(Assumed default)*
- **B) Synchronised** — all buttons reposition simultaneously every second.

**Recommendation:** Staggered (A) is more engaging and less jarring visually.

## Acceptance Criteria

1. **Multiple buttons rendered**: When the game starts, exactly 3 target buttons are visible in the game area simultaneously.
2. **Independent clicking**: Clicking any one of the 3 buttons increments the score by 1. The header score display updates immediately.
3. **Independent movement**: Each button repositions to a new random location on its own timer interval (~1 second). Buttons do not all jump at the same instant.
4. **No overlap**: Buttons do not overlap each other after repositioning (within reasonable tolerance).
5. **Random colours**: Each button receives a random colour from the existing palette on each reposition (same as current single-button behaviour).
6. **Best score tracking**: The best score continues to update correctly when the current score exceeds it.
7. **Score persistence**: The total score is saved to Supabase on the same schedule (debounced 2-second save). The `scores` table schema is unchanged.
8. **Game start/stop lifecycle**: `Game.start()` creates the buttons and starts movement intervals. `Game.stop()` clears all intervals and removes dynamically created buttons.
9. **Auth flow unaffected**: Sign-in, sign-up, sign-out, and account deletion continue to work without changes.
10. **Responsive sizing**: Buttons remain within the visible game area (`#game-area`) on all viewport sizes. No button spawns off-screen.
11. **Existing style preserved**: Buttons use the existing `.target-btn` class styling (circle shape, glow, hover/active effects).
12. **No regression in header**: Score and Best displays in the game header continue to function correctly.

## BDD Scenarios

```gherkin
Feature: Multiple Target Buttons

  The game displays multiple target buttons simultaneously.
  Clicking any button increments the shared score.

  Background:
    Given the user is signed in and on the game screen

  Scenario: Multiple buttons are visible on game start
    Then 3 target buttons are visible in the game area

  Scenario: Clicking any target button increments the score
    Given the current score is 0
    When the user clicks any target button
    Then the score display shows 1

  Scenario: Each button click contributes to the total score
    Given the current score is 0
    When the user clicks target button 1
    And the user clicks target button 2
    And the user clicks target button 3
    Then the score display shows 3

  Scenario: Buttons move independently over time
    When 2 seconds elapse
    Then at least one target button has moved from its initial position

  Scenario: Best score updates when current score exceeds it
    Given the best score is 0
    When the user clicks any target button
    Then the best score display shows 1

  Scenario: Score persists after sign-out and sign-in
    Given the user clicks any target button 5 times
    When the user signs out
    And signs back in with the same credentials
    Then the score display reflects the previously saved score
```

## Risks

### Autonomous-Safe

- **CSS works for multiple elements**: The `.target-btn` class is already defined without any ID-specific selectors, so it will apply correctly to dynamically created buttons. *Low risk.*
- **Dynamic DOM creation**: Creating buttons via `document.createElement` is standard vanilla JS. No framework compatibility concerns. *Low risk.*
- **Staggered timers**: Using `setTimeout` offsets or separate `setInterval` calls per button is straightforward. *Low risk.*

### Human-Review-Required

- **BDD test updates**: Existing BDD scenarios and step definitions reference `#target-btn` (ID selector). These must be updated to use class-based selectors (`.target-btn`) and handle multi-element assertions. The change is mechanical but should be reviewed to ensure no test coverage is lost.
- **Button count decision (OQ-1)**: The assumed default of 3 should be confirmed before implementation.

### Blocking

- None identified. All required context is available in the repository.

## Escalation Conditions

- If during implementation the `game.js` refactor reveals tightly coupled dependencies not visible in the current read (e.g. external scripts referencing `#target-btn`), escalate for architectural review.
- If Supabase schema changes become necessary (they should not), escalate before modifying any migration files.

## Definition of Done

1. Game area displays 3 target buttons simultaneously after sign-in.
2. Clicking any button increments the score; header score and best-score update correctly.
3. Buttons move independently on staggered ~1-second intervals.
4. Buttons do not overlap each other.
5. Score persistence (save/load) works as before.
6. All updated BDD scenarios pass.
7. No regressions in authentication, sign-out, or account deletion.
8. PR passes CI (BDD tests, preview verification).

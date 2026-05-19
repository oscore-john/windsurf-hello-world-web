# ENG-17: Variable Target Button Sizes with Scaled Scoring

## Problem

The target button in the "Click the Button!" game is currently a fixed size (`5rem` / 80px) and always awards exactly 1 point per click. This makes the game mechanically flat — every click is equally difficult and equally rewarded. The ticket requests that the target button appear at different random sizes, with smaller (harder-to-click) buttons awarding more points than larger (easier) ones, adding a skill-based difficulty dimension.

## Goal

Introduce variable button sizing so that each time the target button repositions (on click or on the periodic timer), it randomly selects from a set of predefined size tiers. Smaller buttons award more points per click; larger buttons award fewer. This creates a risk/reward dynamic: players can wait for a large button (easy, low reward) or chase a small button (hard, high reward).

## Non-Goals

- Changing the game timer interval (`MOVE_DELAY_MS = 1000`).
- Adding difficulty levels, settings screens, or user-configurable options.
- Modifying authentication, sign-up/sign-in flows, or account deletion.
- Changing score persistence logic (Supabase upsert) beyond supporting multi-point increments.
- Changing the colour palette or visual theme (colours already randomise per move).
- Adding animations beyond what currently exists.
- Modifying the "best" (high score) tracking logic — it already tracks the maximum score regardless of increment size.

## Context

| Aspect | Current state |
|---|---|
| **Repo** | `oscore-john/windsurf-hello-world-web` |
| **Stack** | Static HTML + CSS + vanilla JS; Supabase auth; deployed on Vercel |
| **Game logic** | `game.js` — IIFE module exposing `start()`, `stop()`, `getScore()` |
| **Button sizing** | Hardcoded `btnSize = 80` in `getRandomPosition()` and `width: 5rem; height: 5rem` in `style.css` |
| **Scoring** | `score++` on every click (always +1) |
| **Positioning** | `getRandomPosition()` subtracts `btnSize` from `area.clientWidth/clientHeight` to keep button in-bounds |
| **Existing BDD** | `features/game.feature` covers score increment, button movement, and button label display |

### Key code references

**`game.js` — current sizing and scoring:**
```js
var btnSize = 80; // hardcoded in getRandomPosition()
// ...
btn.addEventListener("click", function () {
    score++;          // always +1
    btn.textContent = score;
    moveButton();
});
```

**`style.css` — current button dimensions:**
```css
.target-btn {
  width: 5rem;   /* 80px */
  height: 5rem;  /* 80px */
  /* ... */
}
```

## Assumptions

1. **Three size tiers are sufficient** to create meaningful gameplay variety without over-complicating the UI. Proposed tiers:

   | Tier | Name | Diameter | Points per click |
   |------|------|----------|-----------------|
   | 1 | Large | 5rem (80px) | 1 |
   | 2 | Medium | 3.25rem (52px) | 2 |
   | 3 | Small | 2rem (32px) | 5 |

2. **Size is selected randomly on each reposition** — both on click and on the periodic `setInterval` move. Each tier has equal probability (⅓ each).
3. **The point value for the current button is displayed on/in the button** instead of (or alongside) the running score total. This gives the player a clear visual signal of the reward. After a click, the button text reverts to showing the current score as it does today, and the next reposition sets the new point label.
4. **Font size scales proportionally** with button size so text remains legible at all tiers.
5. **The `getRandomPosition()` calculation uses the actual current button size** instead of the hardcoded `80`, ensuring the button stays within the game area bounds at all sizes.
6. **No changes to the Supabase `scores` table schema** — the `score` and `best` columns are integers and already support arbitrary increments.
7. **The button's CSS `width`/`height` are set dynamically via inline styles** in `game.js` (overriding the base CSS), similar to how `left`/`top`/`background`/`borderColor` are already set dynamically.
8. **Existing colour randomisation in `applyRandomColour()`** continues to work independently of size changes.

## Open Questions

None — the feature intent is unambiguous (variable sizes, inverse point scaling), and reasonable defaults for sizes and point values can be defined without product/business-rule decisions. If the team prefers different tier counts, sizes, or point values, these are trivially adjustable constants.

## Acceptance Criteria

1. **Variable sizing**: Each time the target button repositions (on click or timer), it randomly adopts one of at least three distinct sizes (e.g. 80px, 52px, 32px).
2. **Scaled scoring**: Clicking a smaller button awards more points than clicking a larger button. The point values are clearly differentiated (e.g. 1, 2, 5).
3. **Point value indicator**: The button displays its current point value (e.g. "+5") before being clicked, so the player knows the reward.
4. **Score correctness**: After clicking, the displayed score (header `#display-score` and button label) increases by the correct number of points for that button's size tier.
5. **Best score tracking**: The "Best" score in the header updates correctly when the current score exceeds it, regardless of increment size.
6. **In-bounds positioning**: The button never overflows the game area, even at the largest size. `getRandomPosition()` accounts for the current button dimensions.
7. **Score persistence**: Scores saved to Supabase remain correct — the `score` field reflects the cumulative total with variable increments.
8. **No auth regression**: Sign-in, sign-up, sign-out, and account deletion flows remain unaffected.
9. **Font scaling**: Button text is legible at all size tiers — the font size scales down proportionally for smaller buttons.
10. **Visual consistency**: The existing colour randomisation, glow effects, and hover/active transforms continue to work at all button sizes.

## BDD Scenarios

```gherkin
Feature: Variable target button sizes with scaled scoring

  The target button appears at different random sizes each time it
  repositions. Smaller buttons award more points than larger ones.

  Background:
    Given the user is signed in and on the game screen

  Scenario: Button size varies between repositions
    When the target button repositions multiple times
    Then the button should appear at more than one distinct size

  Scenario: Smaller button awards more points than larger button
    Given the target button is at its smallest size
    When the user clicks the target button
    Then the score increases by more than 1 point

  Scenario: Largest button awards base points
    Given the target button is at its largest size
    When the user clicks the target button
    Then the score increases by exactly 1 point

  Scenario: Button displays current point value before click
    When the target button repositions
    Then the button label shows the point value for its current size

  Scenario: Score display updates by correct increment
    Given the current score is 0
    And the target button shows a point value of N
    When the user clicks the target button
    Then the score display shows N

  Scenario: Best score updates when current score exceeds it
    Given the best score is 0
    When the user clicks the target button
    Then the best score updates to match the current score

  Scenario: Button stays within game area at all sizes
    When the target button repositions 20 times
    Then the button is fully visible within the game area each time

  Scenario: Existing score persistence still works
    Given the user clicks the target button several times
    When the user signs out and signs back in
    Then the previous score is restored
```

## Risks

### Autonomous-safe

- **JS-only logic change**: The core change is in `game.js` (size selection, point calculation, dynamic sizing). CSS base styles serve as defaults but are overridden inline. Low risk of side effects.
- **No schema migration**: The Supabase `scores` table already stores integer `score` and `best` values. Variable increments require no schema change.
- **Existing BDD tests may need minor updates**: The scenario "Score increments on button click" asserts the score goes from 0 to 1, which would only pass if the button happens to be the largest tier (1 point). This test may need to assert "score increases" rather than "score shows 1", or be updated to account for variable increments. However, the test could also pass as-is if the largest tier still awards 1 point and the test runs before a size change.

### Human-review-required

- **BDD test `Score increments on button click`**: The existing `game.feature` scenario asserts `Then the score display shows 1` after one click. With variable scoring this only holds for the largest button. The reviewer should confirm whether to:
  - (A) Update the assertion to `Then the score display shows a value greater than 0`, or
  - (B) Seed the button to its largest size during the test, or
  - (C) Accept that the test is probabilistic (passes ~33% of the time).
  
  **Recommendation**: Option (A) is safest and most maintainable.

### Blocking

- None identified.

## Escalation Conditions

- If the team wants non-equal probability distributions (e.g. small buttons appear less often), this requires a product decision on the weighting.
- If the team wants the point values to be configurable at runtime or stored server-side, this would expand scope significantly and should be a separate ticket.
- If additional visual effects per size tier are desired (e.g. different glow intensity for high-value buttons), this should be clarified before implementation.

## Definition of Done

1. `game.js` is updated to randomly select from at least three button size tiers on each reposition.
2. Points awarded per click scale inversely with button size (smaller = more points).
3. The button displays its point value before being clicked.
4. `getRandomPosition()` uses the current button size for boundary calculation.
5. Font size scales appropriately for each button size tier.
6. The `style.css` base `.target-btn` dimensions serve as a default; dynamic sizes are applied via inline styles.
7. Existing BDD tests pass (with any necessary adjustments to account for variable scoring — see Risk section).
8. New BDD scenarios for variable sizing and scaled scoring are added to `features/game.feature`.
9. Score persistence via Supabase works correctly with multi-point increments.
10. Visual verification on Vercel preview confirms buttons render at all sizes correctly.

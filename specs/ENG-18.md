# ENG-18: Outer Ring Around Target Button (Point Deduction)

## Problem

The current click-the-button game has a single circular target button (80 px diameter) that awards +1 point on every click. There is no penalty mechanic — any click on the button is rewarded equally regardless of precision. This makes the game feel low-stakes and reduces the skill ceiling: once a player can click anywhere on the button they have effectively mastered the game.

The ticket requests an **outer ring** surrounding the target button that **deducts points when clicked**. This introduces a risk/reward dynamic where imprecise clicks are penalised, raising the skill ceiling and making the game more engaging.

## Goal

Add a concentric outer ring around the existing target button. The ring moves with the button and acts as a penalty zone:

- Clicking the **inner target button** continues to award **+1 point** (existing behaviour, unchanged).
- Clicking the **outer ring** (the area between the ring's outer edge and the inner button's edge) **deducts 1 point** from the current score.
- The score display, best-score tracking, and persistence all reflect the updated score after deductions.

## Non-Goals

- **Changing the target button's existing size or movement behaviour** — the inner button remains 5 rem (80 px) and moves every 1 second.
- **Adding multiple ring tiers or variable penalty amounts** — only a single outer ring with a flat −1 penalty is in scope.
- **Adding sound effects, animations, or haptic feedback for the penalty** — visual feedback only (the score changing) is sufficient for the initial implementation.
- **Leaderboard or competitive features** — out of scope.
- **Mobile-specific touch target adjustments** — the ring should be functional on mobile via standard touch events, but no special mobile UX is in scope.

## Context

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS, Supabase (Auth + Postgres), no build system |
| Hosting | Vercel (auto-deploys from `main`) |
| Game entry point | `game.js` — IIFE module exposing `Game.start()`, `Game.stop()`, `Game.getScore()` |
| Target button element | `#target-btn` — 5 rem circular, absolutely positioned in `#game-area` |
| Movement logic | `getRandomPosition()` in `game.js` constrains the button within `game-area` bounds (uses hardcoded `btnSize = 80`) |
| Score callback | `onScoreChange(score)` called on each click — `app.js` uses this to update the header display and schedule a debounced save |
| Score persistence | `app.js` → `scheduleSave()` debounces at 2 s, then upserts to `scores` table |
| Best-score tracking | Client-side in `app.js` — `bestScore` variable, updated when `newScore > bestScore` |
| Existing BDD tests | `features/game.feature` — 3 scenarios covering score increment, button movement, and button label |
| CI | GitHub Actions — `bdd-tests.yml` runs playwright-bdd against Vercel preview or production |

### Current DOM Structure (game screen)

```html
<main class="game-area" id="game-area">
  <button class="target-btn" id="target-btn">0</button>
</main>
```

### Current Styling (`.target-btn`)

- `position: absolute; width: 5rem; height: 5rem; border-radius: 50%;`
- Coloured border, background, and box-shadow — randomised on each move via `applyRandomColour()`
- Hover: `transform: scale(1.1)` / Active: `transform: scale(0.95)`

### Current Game Logic (`game.js`)

- `getRandomPosition()` uses `btnSize = 80` to keep the button within bounds.
- On click: `score++`, update button text, call `moveButton()`, invoke `onScoreChange`.
- `moveButton()` sets `left`/`top` styles and applies a random colour.
- The button moves on an interval (`MOVE_DELAY_MS = 1000`).

## Assumptions

1. **Point deduction amount is −1 per outer-ring click.** The ticket says "deducts points" without specifying an amount. A symmetric −1 (matching the +1 for the inner button) is the simplest and most intuitive choice.

2. **The score can go below zero.** There is no floor on the score. This keeps the mechanic simple and avoids masking poor play. The `scores` table column is `integer` which supports negative values.

3. **Best score is never reduced by penalty clicks.** The `best` score represents the all-time high watermark and should only ever increase. Penalty clicks reduce `score` but do not affect `best`.

4. **The outer ring width is approximately 2.5 rem (40 px), making the total clickable area ~10 rem (160 px) diameter.** This provides a meaningful penalty zone (half the inner button's radius on each side) without being so large that it dominates the screen.

5. **The outer ring moves and recolours in sync with the target button.** Both elements share the same position and colour-change cycle.

6. **The outer ring is implemented as a wrapper element around the target button**, using `event.stopPropagation()` on the inner button to distinguish inner vs. outer clicks. This avoids complex hit-testing math while using standard DOM event handling.

7. **The outer ring visual style is a semi-transparent ring** that contrasts with the inner button — using a lower-opacity or distinct-hue version of the button's colour to visually signal "danger zone". The exact visual treatment is left to implementation but should clearly differentiate the ring from the inner button.

8. **The button label continues to display the current score**, including negative values.

9. **The `getRandomPosition()` function must be updated** to use the total outer diameter (160 px) instead of the current 80 px, ensuring the full ring+button stays within the game-area bounds.

## Open Questions

_None — all design decisions can be resolved with the assumptions above. The feature is a straightforward, self-contained game mechanic addition._

## Acceptance Criteria

1. **Outer ring is visible around the target button.** When the game screen loads, a concentric ring is visible around the target button. The ring is visually distinct from the inner button.

2. **Clicking the inner target button awards +1 point.** Existing behaviour is preserved unchanged.

3. **Clicking the outer ring deducts 1 point.** When the user clicks the ring area (between the ring's outer edge and the inner button's edge), the displayed score decreases by 1.

4. **Score can go negative.** If the score is 0 and the user clicks the outer ring, the score becomes −1.

5. **Best score is not reduced by penalty clicks.** The "Best" display only increases; it is never lowered by outer-ring clicks.

6. **The outer ring moves with the target button.** When the button repositions (on click or on the 1-second interval), the outer ring moves to the same new position.

7. **The outer ring recolours with the target button.** The ring's colour updates in sync with `applyRandomColour()`.

8. **The button label reflects the current score after deductions.** If the score is −3, the button displays "−3" (or "-3").

9. **Score persistence includes deducted scores.** Negative or reduced scores are correctly saved to and loaded from the `scores` table.

10. **The entire ring+button stays within the game-area bounds.** The button never clips off-screen due to the larger total element size.

## BDD Scenarios

```gherkin
Feature: Outer Ring Penalty Zone

  The target button is surrounded by a concentric outer ring.
  Clicking the outer ring deducts 1 point from the player's score,
  adding a precision-based risk/reward mechanic.

  Scenario: Clicking the outer ring deducts 1 point
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the outer ring
    Then the score display shows -1

  Scenario: Clicking the inner button still awards 1 point
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the target button
    Then the score display shows 1

  Scenario: Score can go negative via repeated ring clicks
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the outer ring 3 times
    Then the score display shows -3

  Scenario: Best score is not reduced by outer ring clicks
    Given the user is signed in and on the game screen
    And the user clicks the target button 5 times
    And the best score display shows 5
    When the user clicks the outer ring 3 times
    Then the score display shows 2
    And the best score display shows 5

  Scenario: Outer ring moves with the target button
    Given the user is signed in and on the game screen
    When 2 seconds elapse
    Then the outer ring has moved with the target button

  Scenario: Button label shows negative score
    Given the user is signed in and on the game screen
    And the current score is 0
    When the user clicks the outer ring 2 times
    Then the target button label shows -2
```

## Risks

### Autonomous-Safe

1. **Event propagation handling.** The inner button click must call `event.stopPropagation()` to prevent the outer ring's click handler from also firing. This is standard DOM event handling and straightforward to implement and test.

2. **Boundary calculation update.** `getRandomPosition()` must use the larger total diameter (160 px) instead of 80 px. Off-by-one or off-by-padding errors could cause the ring to clip at screen edges. BDD tests for button movement within bounds mitigate this.

3. **Negative score display.** The button label and header score display must handle negative numbers. No special formatting should be needed (`textContent = score` already works for negative integers).

4. **Existing BDD test compatibility.** The existing `game.feature` scenarios click `#target-btn` directly, which should continue to work unchanged. However, the "Score increments on button click" scenario assumes clicking the target button results in +1 — this remains true since only outer-ring clicks deduct. No existing tests should break.

5. **CSS stacking and z-index.** The outer ring element must sit behind the inner button in z-order so that clicks on the inner button hit the button (not the ring). This is achievable with DOM ordering or explicit `z-index`.

### Human-Review-Required

_None identified._

### Blocking

_None identified._

## Escalation Conditions

- If during implementation it is discovered that the Playwright test framework cannot reliably target the outer ring area (e.g., due to overlapping elements or coordinate precision), the BDD test approach may need to be adjusted. This is unlikely given Playwright's `click({ position: ... })` capability but should be flagged if encountered.

## Definition of Done

1. An outer ring element is rendered concentrically around `#target-btn` in the game screen.
2. Clicking the outer ring deducts 1 point; clicking the inner button awards 1 point.
3. Score, best-score, button label, and persistence all handle negative/reduced scores correctly.
4. The ring moves and recolours with the button on every reposition.
5. The total element (ring + button) stays within game-area bounds.
6. All existing BDD tests in `game.feature`, `authentication.feature`, `score-persistence.feature`, and `account-deletion.feature` continue to pass.
7. New BDD scenarios from this spec are added to the feature suite and pass.
8. No changes to the `scores` table schema or Supabase configuration are required.

## Implementation Notes

### Suggested DOM Approach

Wrap the target button in an outer ring container:

```html
<main class="game-area" id="game-area">
  <div class="outer-ring" id="outer-ring">
    <button class="target-btn" id="target-btn">0</button>
  </div>
</main>
```

- `#outer-ring` — absolutely positioned, ~10 rem diameter, `border-radius: 50%`, centred in the same position.
- `#target-btn` — centred within `#outer-ring` using flexbox or absolute positioning.
- Click handler on `#outer-ring` handles the penalty. Click handler on `#target-btn` calls `event.stopPropagation()` to prevent the ring handler from firing.

### Suggested `game.js` Changes

- Update `moveButton()` to position `#outer-ring` (instead of or in addition to `#target-btn`).
- Update `getRandomPosition()` to use the total element size (~160 px) for bounds checking.
- Add a click handler on `#outer-ring` that decrements `score` and triggers `onScoreChange`.
- Ensure `applyRandomColour()` also styles the outer ring (with a distinct/dimmer variant).

### Suggested `style.css` Changes

- Add `.outer-ring` styles: dimensions, border-radius, positioning, visual treatment.
- Ensure `.target-btn` is centred within `.outer-ring`.
- Add hover/active states for the outer ring if desired.

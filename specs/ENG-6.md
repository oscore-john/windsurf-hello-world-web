# ENG-6: Click-the-Button Game

## Problem

The `windsurf-hello-world-web` site is currently a static landing page that displays a random "work of art" card on each page load. There is no interactivity beyond the initial random selection. The ticket requests transforming this into a simple browser game where a button moves continuously and randomly around the screen, and the user scores a point each time they click it. The button should display the user's current score.

## Goal

Replace the current static card UI with an interactive click-chasing game:

- A single button is rendered on the page.
- The button moves continuously to random positions on the screen, making it a challenge to click.
- Each successful click increments a score counter by one.
- The button label displays the user's current score (e.g., `0`, `1`, `2`, ...).
- The game starts immediately on page load with no separate start/menu screen required.

## Non-Goals

- **Persistent high scores / leaderboards** — scores live only in the current browser session.
- **User accounts or authentication** — no login required.
- **Backend or API** — the game is entirely client-side; no server logic.
- **Mobile-specific gesture handling** — standard touch/click events are sufficient; no swipe or multi-touch mechanics.
- **Sound effects or animations beyond movement** — keep the implementation minimal.
- **Preserving the existing "works of art" card** — the current content will be replaced by the game.
- **Adding a build system or framework** — the site must remain plain HTML + CSS + vanilla JS with no build step (consistent with the existing architecture).

## Context

### Repository State

| Attribute | Value |
|---|---|
| Repository | `oscore-john/windsurf-hello-world-web` |
| Tech stack | Static HTML + CSS + vanilla JS (no framework, no build step, no `package.json`) |
| Hosting | Vercel (auto-deploys from `main`) |
| CI/CD | `verify-preview.yml` — checks Vercel preview deployments via bypass header |
| Key files | `index.html`, `style.css`, `works.js` |
| Test infrastructure | None |

### Current Implementation

- **`index.html`**: A single `<main class="hero">` containing a `<section class="card">` with four elements: eyebrow text, title, subtitle, and status pill.
- **`style.css`**: Dark theme with glassmorphism card, centered via CSS Grid. Uses fluid typography (`clamp()`), a radial-gradient background, and a frosted-glass card effect.
- **`works.js`**: An array of 10 "works of art" objects. On load, one is randomly selected and its properties are injected into the DOM. This file will be replaced or substantially rewritten.

### Architectural Constraints

- No `package.json` — no npm/node dependencies, no bundler.
- The Vercel deployment expects a static site served from the repo root (no build command, output directory is `.`).
- The CI workflow (`verify-preview.yml`) checks that the preview body contains `works.js` — this check will need updating if `works.js` is renamed or removed. Alternatively, the reference can be preserved.

## Assumptions

1. **The existing card UI is fully replaced** — the game replaces the current "works of art" showcase. The page will no longer display art cards.
2. **Score is ephemeral** — refreshing the page resets the score to zero. No `localStorage` or session persistence is required.
3. **The button text is the score** — the button label shows only the numeric score (e.g., `0`), not additional text like "Score: 0". (This matches the ticket wording: "let the button show the number of points user has scored.")
4. **"Moves continuously randomly"** means the button repositions itself at a regular interval (e.g., every 1–2 seconds) to a random screen position, not that it animates smoothly along a path. However, a CSS transition for smooth movement between positions is acceptable and encouraged for polish.
5. **The button should remain fully visible on screen** — random positions must account for button dimensions so it does not overflow the viewport.
6. **No difficulty progression** — the movement interval and button size remain constant. (A future ticket could add difficulty scaling.)
7. **The file `works.js` can be replaced** with game logic (e.g., renamed to `game.js` or rewritten in place). If renamed, the CI workflow content check must be updated accordingly.

## Open Questions

> These require human decision before or during implementation.

1. **Button movement interval**: How frequently should the button move? Suggested default: every 1.5 seconds with a CSS transition for smooth movement. Should this be configurable or fixed?

2. **Button styling**: Should the button use the existing glassmorphism/dark-theme aesthetic, or is a simpler, high-contrast style preferred for gameplay visibility?

3. **CI content check**: The current `verify-preview.yml` checks for `works.js` in the response body. If `works.js` is renamed/removed, the CI check needs updating. Is it acceptable to update this check to reference the new script filename (e.g., `game.js`)?

4. **Page title**: Should `<title>` remain "Hello World" or change to something game-related (e.g., "Click Chase")?

## Acceptance Criteria

1. **Button is visible on page load**: A single clickable button is rendered on the page immediately when the page loads.

2. **Button displays current score**: The button's text content is the user's current score, starting at `0`.

3. **Score increments on click**: Each click on the button increases the displayed score by exactly 1.

4. **Button moves continuously**: The button repositions itself to a new random location on the screen at a regular interval (approximately every 1–2 seconds), without requiring user interaction to trigger movement.

5. **Button stays within viewport**: The button's random positions keep it fully visible within the browser viewport at all times (no overflow or clipping).

6. **Movement is independent of clicks**: The button continues to move on its regular interval regardless of whether the user clicks it. Clicking does not reset or pause the movement timer.

7. **No framework or build step added**: The implementation uses plain HTML, CSS, and vanilla JavaScript only. No `package.json`, no bundler, no framework.

8. **Page loads without errors**: The browser console shows no JavaScript errors on page load or during gameplay.

9. **Responsive**: The game is playable on both desktop and mobile viewports (the button positions respect the current viewport dimensions and adjust on resize).

10. **CI workflow remains functional**: The `verify-preview.yml` workflow continues to pass on preview deployments (content check updated if the script filename changes).

## BDD Scenarios

```gherkin
Feature: Click-the-button game

  Scenario: Game initializes on page load
    Given a user navigates to the game page
    Then a single button should be visible on the screen
    And the button text should be "0"

  Scenario: Score increments on button click
    Given the game has loaded and the score is 0
    When the user clicks the button
    Then the button text should be "1"
    When the user clicks the button again
    Then the button text should be "2"

  Scenario: Button moves to random positions continuously
    Given the game has loaded
    When 3 seconds have elapsed without any user interaction
    Then the button should have changed position at least once
    And the button should be fully visible within the viewport

  Scenario: Button remains within viewport bounds
    Given the game has loaded
    When the button moves to a new random position
    Then the button's bounding rectangle should be fully within the viewport
    And no part of the button should be clipped or hidden

  Scenario: Movement continues independently of clicks
    Given the game has loaded and the user clicks the button
    When the movement interval elapses
    Then the button should move to a new position
    And the score should remain unchanged (only clicks increment score)

  Scenario: Score resets on page refresh
    Given the user has scored 5 points
    When the user refreshes the page
    Then the button text should be "0"

  Scenario: Game works on mobile viewport
    Given the browser viewport is 375x667 (mobile)
    When the game loads
    Then the button should be visible and clickable
    And the button should move within the mobile viewport bounds

  Scenario: No console errors during gameplay
    Given the game has loaded
    When the user plays the game for 30 seconds
    Then the browser console should contain no JavaScript errors
```

## Risks

### Autonomous-Safe

1. **Simple client-side change**: The entire implementation is vanilla HTML/CSS/JS with no backend, no database, no auth, and no financial logic. Safe for autonomous implementation.

2. **Existing content replaced**: The "works of art" data in `works.js` will be removed or replaced. This is intentional per the ticket and is a low-risk content change.

3. **CI content check update**: If `works.js` is renamed, the grep check in `verify-preview.yml` must be updated. This is a straightforward one-line change.

### Human-Review-Required

4. **Visual design review**: The button styling and overall game appearance should be reviewed by a human to ensure it meets the team's standards, even though the implementation is low-risk.

### Blocking

5. **None identified**: All information needed for implementation is available. The codebase is simple and fully understood.

## Escalation Conditions

- If the team wants to preserve the existing "works of art" showcase alongside the game (e.g., on a separate page or as a toggle), that would change the scope and require clarification.
- If persistent scores, user accounts, or leaderboards are desired, that is a separate ticket.

## Implementation Path

1. **Modify `index.html`**: Replace the card content with a game container and button element. Keep the dark-theme background and overall page structure.
2. **Update `style.css`**: Style the game button (size, colours, cursor, transitions). Remove or repurpose card-specific styles. Add `position: absolute` for the button to enable free positioning.
3. **Replace `works.js`** (or rename to `game.js`): Implement the game logic:
   - Initialize score to 0 and set button text.
   - `setInterval` to reposition the button at random `(x, y)` within viewport bounds.
   - Click handler to increment score and update button text.
   - Window resize handler to clamp button position within new viewport bounds.
4. **Update `verify-preview.yml`**: Change the content check from `works.js` to the new script filename (if renamed).
5. **Commit, PR, deploy**: Push changes, create PR, verify Vercel preview deployment.

## Definition of Done

- [ ] Button is visible on page load with score showing `0`
- [ ] Clicking the button increments the score by 1
- [ ] Button moves to a new random position at a regular interval (~1–2s)
- [ ] Button always stays within the viewport
- [ ] No JavaScript errors in the browser console
- [ ] Works on both desktop and mobile viewports
- [ ] No framework or build step introduced
- [ ] CI `verify-preview.yml` passes on preview deployment
- [ ] PR reviewed and merged to `main`

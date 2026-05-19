# ENG-15: Change Button Colour

## Problem

The ticket requests a button colour change in the "Click the Button!" web application. The current ticket description is minimal — "change button colour" — and does not specify which button(s) should change or what the target colour should be. This spec documents the current state, identifies open questions, and provides a ready-to-implement framework once the human reviewer resolves the ambiguities.

## Goal

Change the colour of the specified button(s) in the application to a new colour chosen by the team, ensuring visual consistency across all button states (default, hover, active, disabled) and maintaining adequate contrast for accessibility.

## Non-Goals

- Changing button shape, size, position, or layout.
- Changing button text or labels.
- Adding new buttons or removing existing ones.
- Modifying any non-button UI elements (backgrounds, text, inputs, etc.).
- Changing JavaScript behaviour or game logic.
- Changing Supabase or authentication functionality.

## Context

| Aspect | Current state |
|---|---|
| **Repo** | `oscore-john/windsurf-hello-world-web` |
| **Stack** | Static HTML + CSS + vanilla JS; Supabase auth; deployed on Vercel |
| **File** | `style.css` contains all button styling |
| **Existing BDD** | `features/game.feature`, `features/authentication.feature`, `features/score-persistence.feature` |

### Current Buttons

The application has three distinct button types, all styled in `style.css`:

| Button | CSS class | Location | Current colour | Hover colour |
|---|---|---|---|---|
| Sign In / Sign Up | `.auth-btn` | Auth screen (lines 75–94) | `rgba(8, 145, 178, 0.7)` (teal) | `rgba(8, 145, 178, 0.9)` |
| Sign Out | `.sign-out-btn` | Game header (lines 154–167) | `transparent` (border only) | `rgba(255, 255, 255, 0.08)` |
| Target (game) | `.target-btn` | Game area (lines 177–202) | `rgba(8, 145, 178, 0.45)` (teal + glow) | `rgba(8, 145, 178, 0.65)` + enhanced glow |

The application uses a dark colour scheme (`#0f172a` background) with a teal/cyan accent palette (`#67e8f9`, `rgba(8, 145, 178, …)`). All three button types share this teal accent.

## Assumptions

1. **Scope is limited to CSS changes in `style.css`** — no HTML or JS changes are expected.
2. **The dark theme and overall design language remain unchanged** — only button colour(s) shift.
3. **All button states must be updated consistently** — default, hover, active, and disabled states should all reflect the new colour.
4. **The target button's glow and border effects should harmonise** with the new colour if the target button is in scope.
5. **No new dependencies or build steps are required** — this is a pure CSS edit.

## Open Questions

> These require human decision before implementation can proceed.

### OQ-1: Which button(s) should change colour?

The ticket says "button" (singular), but there are three button types. Options:

- **A) Target button only** (`.target-btn`) — the most prominent, game-central button.
- **B) Auth buttons only** (`.auth-btn`) — Sign In / Sign Up on the auth screen.
- **C) All buttons** — a full palette shift for every button type.
- **D) Sign-out button only** (`.sign-out-btn`) — the least prominent button.

**Assumption if not clarified:** The target button (`.target-btn`) is the most likely candidate, as it is the primary interactive element and the one users spend the most time interacting with.

### OQ-2: What is the desired new colour?

The ticket does not specify a target colour. Options to consider:

- A specific hex/RGB value (e.g. `#e11d48` rose, `#16a34a` green, `#f59e0b` amber).
- A general direction (e.g. "make it red", "warmer tones", "match brand colours").
- A named colour palette from an existing design system.

**Assumption if not clarified:** Implementation should pick a visually distinct colour that contrasts well against the dark background (`#0f172a`) and maintains WCAG AA contrast ratio (4.5:1 for text on buttons).

## Acceptance Criteria

1. **Colour change applied**: The specified button(s) display the new colour in their default state.
2. **Hover state updated**: The hover colour is a visually related variant (e.g. lighter/darker shade) of the new base colour.
3. **Active state updated**: The active/pressed state remains visually distinct from the hover state.
4. **Disabled state preserved**: If applicable (`.auth-btn:disabled`), the disabled state retains reduced opacity over the new base colour.
5. **Border and glow consistency** (if `.target-btn` is in scope): The `border-color` and `box-shadow` glow colours harmonise with the new background colour.
6. **Text contrast**: Button text remains legible against the new background colour, meeting WCAG AA contrast (4.5:1 minimum).
7. **No regressions**: Other UI elements (auth card, inputs, header, background) remain unchanged.
8. **Cross-browser**: The colour renders consistently in Chrome, Firefox, and Safari (latest versions).

## BDD Scenarios

```gherkin
Feature: Button colour change

  The application's button(s) should render with the updated colour
  while preserving all existing functionality and accessibility.

  Scenario: Target button displays new colour
    Given the user is signed in and on the game screen
    Then the target button background colour is the specified new colour
    And the target button text is legible against the new background

  Scenario: Target button hover state uses related colour
    Given the user is signed in and on the game screen
    When the user hovers over the target button
    Then the target button background changes to the hover variant of the new colour

  Scenario: Auth button displays new colour (if auth buttons are in scope)
    Given the user is on the auth screen
    Then the Sign In button background colour is the specified new colour
    And the button text is legible against the new background

  Scenario: Auth button disabled state preserves reduced opacity
    Given the user is on the auth screen
    When the sign-in form is being submitted
    Then the Sign In button appears visually disabled with reduced opacity of the new colour

  Scenario: Existing game functionality unaffected
    Given the user is signed in and on the game screen
    When the user clicks the target button
    Then the score increments by 1
    And the button moves to a new position

  Scenario: Existing authentication flow unaffected
    Given the user is on the auth screen
    When the user enters valid credentials and submits
    Then the game screen is displayed
```

> **Note:** The specific colour value assertions (e.g. `rgb(...)`) should be filled in once OQ-2 is resolved. The BDD scenarios above are structural and should be parameterised with the chosen colour at implementation time.

## Risks

### Autonomous-safe

- **CSS-only change**: The modification is confined to `style.css` and carries no risk of breaking JavaScript logic, authentication flows, or data persistence.
- **Existing BDD tests**: Current tests in `features/` validate authentication and game behaviour (score increment, button movement) but do not assert specific colours. They should pass without modification.

### Human-review-required

- **Aesthetic judgment**: Colour choice is a design/product decision that cannot be made autonomously. The reviewer must confirm the target colour before implementation.
- **Accessibility compliance**: If the chosen colour has low contrast against the dark background or button text, the reviewer should flag this. A contrast check tool (e.g. WebAIM) should be used during review.

### Blocking

- **OQ-1 and OQ-2 are unresolved**: Implementation cannot produce a correct, reviewable result without knowing which button(s) and what colour. These are soft-blocking — a reasonable default can be assumed, but the reviewer should confirm before merging.

## Escalation Conditions

- If the desired colour change is part of a broader design system overhaul, this ticket should be re-scoped or linked to a parent epic.
- If the colour must match specific brand guidelines, the brand palette or design file must be provided.

## Definition of Done

1. `style.css` is updated with the new colour for the specified button(s) across all states (default, hover, active, disabled).
2. No other files are modified (unless border/glow colours in `.target-btn` need harmonising).
3. Existing BDD tests (`npm test`) pass without modification.
4. Visual verification confirms the new colour renders correctly on the Vercel preview deployment.
5. WCAG AA contrast ratio is met for text on the new button background.

# ENG-25: Rotate Target Button Points Indicator 90 Degrees Randomly on Each Appearance

## Problem

The target button's points indicator text ("+1", "+2", "+5") is always rendered upright at 0° rotation. Every reposition looks visually similar apart from colour and size changes. Adding random 90-degree rotations to the points text on each appearance increases visual variety and slightly raises difficulty by forcing the player to read rotated labels, making the game more engaging.

## Goal

Each time a target button repositions (on click or on the periodic timer), its points indicator text should be rotated by a randomly selected multiple of 90 degrees (0°, 90°, 180°, or 270°). The rotation is applied per-button, per-reposition — each button independently selects a new random rotation every time it moves.

## Non-Goals

- Rotating the entire button or outer ring (only the points text label rotates).
- Continuous/animated spin effects — the rotation is set discretely on each reposition.
- Changing point values, size tiers, colours, or any other game mechanic.
- Adding user-configurable rotation settings.
- Modifying authentication, score persistence, or account deletion flows.
- Changing the move interval (`MOVE_DELAY_MS`).
- Changing deployment or CI configuration.

## Context

| Aspect | Current state |
|---|---|
| **Repo** | `oscore-john/windsurf-hello-world-web` |
| **Stack** | Next.js 15 App Router + TypeScript; Supabase auth; deployed on Vercel |
| **Game logic** | `src/lib/game-engine.ts` — module exposing `Game.start()`, `Game.stop()`, `Game.getScore()` |
| **Points indicator** | Set in `moveButton()` via `btn.textContent = '+' + tier.points` (line 104) |
| **Button creation** | `createButton()` (line 108) creates a `<button class="target-btn">` inside a `<div class="outer-ring">` |
| **Button repositioning** | `moveButton(index)` — called on click and by `setInterval` every 1 second |
| **Existing transforms** | `.target-btn:hover { transform: scale(1.1) }` and `.target-btn:active { transform: scale(0.95) }` in `globals.css` |
| **Existing BDD** | `features/game.feature` — covers score increment, button movement, size variation, point display |

### Key code reference

**`src/lib/game-engine.ts` — `moveButton()`:**
```ts
function moveButton(index: number): void {
  const ring = rings[index];
  const btn = buttons[index];
  const tier = selectRandomTier();
  buttonTiers[index] = tier;
  applySize(btn, tier);
  const existing = getCurrentPositions(index);
  const pos = getRandomPosition(existing);
  ring.style.left = pos.x + 'px';
  ring.style.top = pos.y + 'px';
  btn.textContent = '+' + tier.points;   // ← points indicator set here
  applyRandomColour(btn, ring);
}
```

**`src/app/globals.css` — existing hover/active transforms:**
```css
.target-btn:hover {
  transform: scale(1.1);
}
.target-btn:active {
  transform: scale(0.95);
}
```

### Implementation approach

The points indicator text should be wrapped in a `<span>` element inside the button, with the rotation applied to the span via an inline `transform: rotate(Ndeg)` style. This avoids conflicting with the button-level hover/active scale transforms defined in CSS.

**Concrete changes:**

1. **`src/lib/game-engine.ts`**:
   - Define rotation constants: `const ROTATIONS = [0, 90, 180, 270];`
   - In `createButton()`: create a `<span>` child inside the button to hold the points text. Style the span with `display: inline-block` (required for `transform` to work on inline elements).
   - In `moveButton()`: instead of `btn.textContent = '+' + tier.points`, update the span's `textContent` and set `span.style.transform = 'rotate(' + ROTATIONS[randomIndex] + 'deg)'`.

2. **`src/app/globals.css`** (optional): No CSS changes strictly required since the rotation is applied via inline styles. If preferred, a `.points-label` class can be added for the span with `display: inline-block` as a base style.

3. **`features/game.feature`**: Add a new scenario verifying that points indicators can appear at different rotations.

## Assumptions

1. **Four rotation values with equal probability.** The rotation is one of 0°, 90°, 180°, or 270°, each with 25% probability. This provides good variety while keeping text at cardinal orientations (always axis-aligned).
2. **Rotation applies to the text label only, not the entire button.** The ticket says "Points indicator" which is the "+N" text. The button circle and outer ring remain unrotated. This preserves the existing hover/active scale transforms on the button.
3. **Rotation is selected independently per button, per reposition.** Each of the 3 buttons picks its own random rotation every time it moves. Two buttons can have the same rotation by chance.
4. **No animation on the rotation change.** The rotation snaps to the new value on each reposition rather than animating between rotations. This matches the existing behaviour where size/colour/position all change instantly.
5. **The `<span>` wrapper approach is acceptable.** Wrapping the text in a span is a minimal DOM change that cleanly separates text rotation from button-level transforms. The alternative (combining rotation into the button's inline transform and updating CSS hover/active rules to also include rotation) is more fragile.
6. **The `display: inline-block` style on the span** is necessary for CSS `transform` to apply to it. This is set inline or via a class.

## Open Questions

None. The feature is unambiguous: randomise the rotation of the points text from a set of 90-degree increments on each reposition. The implementation approach is straightforward with no product, business, or architectural decisions required.

## Acceptance Criteria

1. **Random rotation on reposition**: Each time a target button repositions (on click or timer), the points indicator text is displayed at a rotation randomly selected from {0°, 90°, 180°, 270°}.
2. **Independent per button**: Each of the 3 buttons independently selects its own rotation on each reposition.
3. **Visual correctness**: The rotated text remains centred within the button and does not clip or overflow the button boundary at any size tier.
4. **No impact on hover/active transforms**: The button's existing hover (scale 1.1) and active (scale 0.95) CSS transforms continue to work correctly alongside the text rotation.
5. **All four rotations observable**: Over multiple repositions, all four rotation values (0°, 90°, 180°, 270°) are used (statistically — not required on every single cycle).
6. **Point value still readable**: The "+N" text content is preserved; only its visual rotation changes.
7. **Existing functionality preserved**: Score incrementing, outer-ring penalty, size tiers, colour changes, score persistence, and all other game mechanics remain unchanged.

## BDD Scenarios

```gherkin
Feature: Points Indicator Rotation

  The points indicator text on each target button is randomly rotated
  by a multiple of 90 degrees on every reposition, adding visual variety.

  Background:
    Given the user is signed in and on the game screen

  Scenario: Points indicator displays at a rotated angle
    Then at least one target button has a rotated points indicator

  Scenario: Rotation changes between repositions
    When the buttons reposition multiple times
    Then at least one button should display its points indicator at more than one distinct rotation

  Scenario: All four rotations are used across buttons
    When the buttons reposition 20 times
    Then points indicators have appeared at rotations 0, 90, 180, and 270 degrees

  Scenario: Rotation does not affect point value text
    Then every target button displays a valid point value label

  Scenario: Rotated text remains within button bounds
    When the buttons reposition multiple times
    Then the points indicator text does not overflow its button
```

## Risks

| Risk | Category | Notes |
|---|---|---|
| Hover/active transform conflict | Autonomous-safe | Mitigated by applying rotation to a child `<span>` rather than the button itself. If rotation were on the button, CSS transforms would override each other. |
| Text overflow at 90°/270° on small buttons | Autonomous-safe | The points text is short ("+1", "+2", "+5") and button sizes are 32px+, so overflow is unlikely. Can be verified visually during implementation. |
| BDD test fragility for rotation detection | Autonomous-safe | Tests can inspect the span's inline `transform` style or `getComputedStyle`. May need to wait for at least one reposition cycle. |

No human-review-required or blocking risks identified.

## Escalation Conditions

- If the hover/active transforms on `.target-btn` prove incompatible with the span-rotation approach (unlikely), escalate for CSS architecture review.
- If the BDD test framework cannot reliably inspect inline transform styles on dynamically created elements, escalate for test tooling guidance.

## Definition of Done

- [ ] `moveButton()` applies a random 90-degree rotation to the points indicator text on each call.
- [ ] Rotation is applied via a `<span>` wrapper inside the button to avoid conflicting with button-level CSS transforms.
- [ ] All four rotation values (0°, 90°, 180°, 270°) are used with equal probability.
- [ ] Existing game mechanics (scoring, size tiers, colours, outer-ring penalty, score persistence) are unaffected.
- [ ] BDD scenarios for rotation are added to `features/game.feature` or a new feature file.
- [ ] All existing BDD tests continue to pass.
- [ ] The build (`npm run build`) succeeds without errors.

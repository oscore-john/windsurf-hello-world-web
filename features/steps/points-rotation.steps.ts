import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

function parseRotation(transform: string | null): number {
  if (!transform || transform === 'none') return 0;
  const match = transform.match(/rotate\((\d+)deg\)/);
  return match ? Number(match[1]) : 0;
}

Then('at least one target button has a rotated points indicator', async ({ page }) => {
  await expect(async () => {
    const spans = page.locator('.target-btn .points-label');
    const count = await spans.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const transform = await spans.nth(i).getAttribute('style');
      const rotation = parseRotation(transform);
      if (rotation !== 0) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  }).toPass({ timeout: 10000 });
});

Then('at least one button should display its points indicator at more than one distinct rotation', async ({ page }) => {
  const rotationsPerButton = new Map<number, Set<number>>();
  for (let i = 0; i < 30; i++) {
    const spans = page.locator('.target-btn .points-label');
    const count = await spans.count();
    for (let j = 0; j < count; j++) {
      const transform = await spans.nth(j).getAttribute('style');
      const rotation = parseRotation(transform);
      if (!rotationsPerButton.has(j)) {
        rotationsPerButton.set(j, new Set());
      }
      rotationsPerButton.get(j)!.add(rotation);
    }
    await page.waitForTimeout(350);
  }
  let found = false;
  for (const rotations of rotationsPerButton.values()) {
    if (rotations.size > 1) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
});

When('the buttons reposition {int} times', async ({ page }, count: number) => {
  await page.waitForTimeout(count * 1000);
});

Then('points indicators have appeared at rotations 0, 90, 180, and 270 degrees', async ({ page }) => {
  const allRotations = new Set<number>();
  for (let i = 0; i < 30; i++) {
    const spans = page.locator('.target-btn .points-label');
    const count = await spans.count();
    for (let j = 0; j < count; j++) {
      const transform = await spans.nth(j).getAttribute('style');
      allRotations.add(parseRotation(transform));
    }
    await page.waitForTimeout(350);
  }
  expect(allRotations.has(0)).toBe(true);
  expect(allRotations.has(90)).toBe(true);
  expect(allRotations.has(180)).toBe(true);
  expect(allRotations.has(270)).toBe(true);
});

Then('every target button displays a valid point value label', async ({ page }) => {
  await expect(async () => {
    const spans = page.locator('.target-btn .points-label');
    const count = await spans.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await spans.nth(i).textContent();
      expect(text).toMatch(/^\+[0-9]+$/);
    }
  }).toPass({ timeout: 5000 });
});

Then('the points indicator text does not overflow its button', async ({ page }) => {
  const buttons = page.locator('.target-btn');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btnBox = await buttons.nth(i).boundingBox();
    expect(btnBox).not.toBeNull();
    const span = buttons.nth(i).locator('.points-label');
    const spanBox = await span.boundingBox();
    expect(spanBox).not.toBeNull();
    expect(spanBox!.x).toBeGreaterThanOrEqual(btnBox!.x - 1);
    expect(spanBox!.y).toBeGreaterThanOrEqual(btnBox!.y - 1);
    expect(spanBox!.x + spanBox!.width).toBeLessThanOrEqual(btnBox!.x + btnBox!.width + 1);
    expect(spanBox!.y + spanBox!.height).toBeLessThanOrEqual(btnBox!.y + btnBox!.height + 1);
  }
});

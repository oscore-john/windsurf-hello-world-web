import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

Given('the current score is {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#display-score')).toHaveText(String(expected));
});

Then('{int} target buttons are visible in the game area', async ({ page }, count: number) => {
  await expect(page.locator('#game-area .target-btn')).toHaveCount(count);
});

When('the user clicks any target button', async ({ page }) => {
  await page.locator('.target-btn').first().click();
});

When('the user clicks target button {int}', async ({ page }, index: number) => {
  await page.locator('.target-btn').nth(index - 1).click();
});

Then('the score display shows {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#display-score')).toHaveText(String(expected));
});

Then('the score display shows a value greater than {int}', async ({ page }, min: number) => {
  const text = await page.locator('#display-score').textContent();
  const score = Number(text);
  expect(score).toBeGreaterThan(min);
});

When('{int} seconds elapse', async ({ page }, seconds: number) => {
  await page.waitForTimeout(seconds * 1000);
});

Then('at least one target button has moved from its initial position', async ({ page }) => {
  const buttons = page.locator('.target-btn');
  const count = await buttons.count();
  const initialPositions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    initialPositions.push({ x: box!.x, y: box!.y });
  }

  await page.waitForTimeout(1500);

  let moved = false;
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    if (box!.x !== initialPositions[i].x || box!.y !== initialPositions[i].y) {
      moved = true;
      break;
    }
  }
  expect(moved).toBe(true);
});

Then('the best score display is greater than {int}', async ({ page }, min: number) => {
  const text = await page.locator('#display-best').textContent();
  const best = Number(text);
  expect(best).toBeGreaterThan(min);
});

Then('at least one button label matches a point value format', async ({ page }) => {
  await expect(async () => {
    const buttons = page.locator('.target-btn');
    const count = await buttons.count();
    let matched = false;
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      if (text && /^\+[0-9]+$/.test(text)) {
        matched = true;
        break;
      }
    }
    expect(matched).toBe(true);
  }).toPass({ timeout: 5000 });
});

When('the buttons reposition multiple times', async ({ page }) => {
  await page.waitForTimeout(5000);
});

Then('at least one button should appear at more than one distinct size', async ({ page }) => {
  const sizes = new Set<number>();
  for (let i = 0; i < 30; i++) {
    const buttons = page.locator('.target-btn');
    const count = await buttons.count();
    for (let j = 0; j < count; j++) {
      const box = await buttons.nth(j).boundingBox();
      if (box) {
        sizes.add(Math.round(box.width));
      }
    }
    await page.waitForTimeout(350);
  }
  expect(sizes.size).toBeGreaterThan(1);
});

let targetBtnIndex = 0;

Given('a target button is showing +{int}', async ({ page }, points: number) => {
  const target = `+${points}`;
  await expect(async () => {
    const buttons = page.locator('.target-btn');
    const count = await buttons.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      if (text === target) {
        targetBtnIndex = i;
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  }).toPass({ timeout: 15000 });
});

When('the user clicks that target button', async ({ page }) => {
  await page.locator('.target-btn').nth(targetBtnIndex).click();
});

Then('the score display shows a valid point increment', async ({ page }) => {
  const text = await page.locator('#display-score').textContent();
  const score = Number(text);
  expect([1, 2, 5]).toContain(score);
});

Then('all buttons are fully visible within the game area', async ({ page }) => {
  const area = await page.locator('#game-area').boundingBox();
  expect(area).not.toBeNull();
  const buttons = page.locator('.target-btn');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(area!.x - 1);
    expect(box!.y).toBeGreaterThanOrEqual(area!.y - 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(area!.x + area!.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(area!.y + area!.height + 1);
  }
});

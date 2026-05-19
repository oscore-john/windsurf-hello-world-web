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

Then('the best score display shows {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#display-best')).toHaveText(String(expected));
});

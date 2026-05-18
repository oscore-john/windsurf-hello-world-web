import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

Given('the current score is {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#display-score')).toHaveText(String(expected));
});

When('the user clicks the target button', async ({ page }) => {
  await page.locator('#target-btn').click();
});

Then('the score display shows {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#display-score')).toHaveText(String(expected));
});

When('{int} seconds elapse', async ({ page }, seconds: number) => {
  await page.waitForTimeout(seconds * 1000);
});

Then('the target button has moved from its initial position', async ({ page }) => {
  const btn = page.locator('#target-btn');
  const initial = await btn.boundingBox();
  await page.waitForTimeout(1500);
  const after = await btn.boundingBox();
  expect(initial).not.toBeNull();
  expect(after).not.toBeNull();
  const moved = initial!.x !== after!.x || initial!.y !== after!.y;
  expect(moved).toBe(true);
});

When('the user clicks the target button {int} times', async ({ page }, times: number) => {
  for (let i = 0; i < times; i++) {
    await page.locator('#target-btn').click();
  }
});

Then('the target button label shows {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#target-btn')).toHaveText(String(expected));
});

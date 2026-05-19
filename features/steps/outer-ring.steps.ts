import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

async function waitForGameReady(page: import('@playwright/test').Page) {
  await page.locator('.outer-ring[style*="left"]').first().waitFor({ state: 'attached', timeout: 10_000 });
}

When('the user clicks the target button', async ({ page }) => {
  await waitForGameReady(page);
  await page.locator('.target-btn').first().click();
});

Given('the user clicks the target button {int} times', async ({ page }, times: number) => {
  await waitForGameReady(page);
  const btn = page.locator('.target-btn').first();
  for (let i = 0; i < times; i++) {
    await btn.click();
  }
});

When('the user clicks the outer ring', async ({ page }) => {
  await waitForGameReady(page);
  const ring = page.locator('.outer-ring').first();
  await ring.click({ position: { x: 10, y: 80 } });
});

When('the user clicks the outer ring {int} times', async ({ page }, times: number) => {
  await waitForGameReady(page);
  const ring = page.locator('.outer-ring').first();
  for (let i = 0; i < times; i++) {
    await ring.click({ position: { x: 10, y: 80 } });
  }
});

Then('the outer ring has moved with the target button', async ({ page }) => {
  const ring = page.locator('.outer-ring').first();
  const initial = await ring.boundingBox();
  await page.waitForTimeout(1500);
  const after = await ring.boundingBox();
  expect(initial).not.toBeNull();
  expect(after).not.toBeNull();
  const moved = initial!.x !== after!.x || initial!.y !== after!.y;
  expect(moved).toBe(true);
});

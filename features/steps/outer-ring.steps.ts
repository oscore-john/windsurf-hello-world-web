import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { When, Then } = createBdd(test);

async function waitForGameReady(page: import('@playwright/test').Page) {
  // Wait for the outer ring to be positioned (indicates Game.start has run)
  await page.locator('#outer-ring[style*="left"]').waitFor({ state: 'attached', timeout: 10_000 });
}

When('the user clicks the outer ring', async ({ page }) => {
  await waitForGameReady(page);
  const ring = page.locator('#outer-ring');
  // Click near the left edge of the ring (within the ring, outside the inner button)
  await ring.click({ position: { x: 10, y: 80 } });
});

When('the user clicks the outer ring {int} times', async ({ page }, times: number) => {
  await waitForGameReady(page);
  const ring = page.locator('#outer-ring');
  for (let i = 0; i < times; i++) {
    await ring.click({ position: { x: 10, y: 80 } });
  }
});

Then('the best score display shows {int}', async ({ page }, expected: number) => {
  await expect(page.locator('#display-best')).toHaveText(String(expected));
});

Then('the outer ring has moved with the target button', async ({ page }) => {
  const ring = page.locator('#outer-ring');
  const initial = await ring.boundingBox();
  await page.waitForTimeout(1500);
  const after = await ring.boundingBox();
  expect(initial).not.toBeNull();
  expect(after).not.toBeNull();
  const moved = initial!.x !== after!.x || initial!.y !== after!.y;
  expect(moved).toBe(true);
});

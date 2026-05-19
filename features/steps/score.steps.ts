import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

let savedEmail = '';
let savedPassword = '';

Given(
  'the user is signed in and scores {int} points',
  async ({ page, signedInUser }, points: number) => {
    savedEmail = signedInUser.email;
    savedPassword = signedInUser.password;
    for (let i = 0; i < points; i++) {
      await page.locator('.target-btn').first().click();
    }
    // Wait for the debounced save (2 s) to fire and the Supabase upsert to return
    await page.waitForResponse(
      (resp) => resp.url().includes('/rest/v1/scores') && resp.status() < 400,
      { timeout: 10_000 },
    );
  },
);

When('the user signs out', async ({ page }) => {
  // Sign-out triggers an immediate saveScore; wait for that request too
  const savePromise = page.waitForResponse(
    (resp) => resp.url().includes('/rest/v1/scores') && resp.status() < 400,
    { timeout: 10_000 },
  ).catch(() => {});
  await page.locator('#sign-out-btn').click();
  await savePromise;
  await page.locator('#auth-screen').waitFor({ state: 'visible' });
});

When('signs back in with the same credentials', async ({ page }) => {
  // Sign-up form may still be showing; switch to sign-in form if needed
  if (await page.locator('#signin-form').isHidden()) {
    await page.locator('#show-signin').click();
  }
  await page.locator('#signin-email').fill(savedEmail);
  await page.locator('#signin-password').fill(savedPassword);
  // After sign-in the app calls loadScore which fetches from Supabase
  const loadPromise = page.waitForResponse(
    (resp) => resp.url().includes('/rest/v1/scores') && resp.request().method() === 'GET',
    { timeout: 10_000 },
  );
  await page.locator('#signin-form .auth-btn').click();
  await page.locator('#game-screen').waitFor({ state: 'visible' });
  await loadPromise;
  // Small buffer for the UI to update from the response
  await page.waitForTimeout(500);
});

Then('the score display reflects the previously saved score', async ({ page }) => {
  const score = await page.locator('#display-score').textContent();
  const best = await page.locator('#display-best').textContent();
  const scoreNum = Number(score);
  const bestNum = Number(best);
  expect(scoreNum + bestNum).toBeGreaterThan(0);
});

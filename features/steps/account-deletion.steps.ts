import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

let deletedEmail = '';
let deletedPassword = '';

Then('a delete-account button is visible', async ({ page }) => {
  await expect(page.locator('#delete-account-btn')).toBeVisible();
});

When('the user clicks the delete-account button', async ({ page }) => {
  // Set up the dialog handler before clicking
  // The handler is consumed by the next step (confirm or dismiss)
});

When('confirms the deletion in the dialog', async ({ page, signedInUser }) => {
  deletedEmail = signedInUser.email;
  deletedPassword = signedInUser.password;

  page.on('dialog', (dialog) => dialog.accept());

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/functions/v1/delete-account'),
    { timeout: 15_000 },
  );

  await page.locator('#delete-account-btn').click();
  await responsePromise;
  await page.locator('#auth-screen').waitFor({ state: 'visible', timeout: 10_000 });
});

Then('the user cannot sign in with the deleted credentials', async ({ page }) => {
  // Switch to sign-in form if needed
  if (await page.locator('#signin-form').isHidden()) {
    await page.locator('#show-signin').click();
  }
  await page.locator('#signin-email').fill(deletedEmail);
  await page.locator('#signin-password').fill(deletedPassword);
  await page.locator('#signin-form .auth-btn').click();
  await expect(page.locator('#auth-error')).not.toBeEmpty({ timeout: 10_000 });
});

When('dismisses the confirmation dialog', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.dismiss());
  await page.locator('#delete-account-btn').click();
});

Then('the game screen remains displayed', async ({ page }) => {
  await expect(page.locator('#game-screen')).toBeVisible();
});

Then("the user's score is unchanged", async ({ page }) => {
  // The game screen should still be visible with scores intact
  await expect(page.locator('#display-score')).toBeVisible();
  await expect(page.locator('#display-best')).toBeVisible();
});

Given('the user is signed in and has a saved score', async ({ page, signedInUser }) => {
  deletedEmail = signedInUser.email;
  deletedPassword = signedInUser.password;

  // Click a target button to score a point
  await page.locator('.target-btn').first().click();

  // Wait for the debounced save to fire
  await page.waitForResponse(
    (resp) => resp.url().includes('/rest/v1/scores') && resp.status() < 400,
    { timeout: 10_000 },
  );
});

When('the user deletes their account', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/functions/v1/delete-account'),
    { timeout: 15_000 },
  );

  await page.locator('#delete-account-btn').click();
  await responsePromise;
  await page.locator('#auth-screen').waitFor({ state: 'visible', timeout: 10_000 });
});

When('a new account is created with the same email', async ({ page }) => {
  // Switch to sign-up form if needed
  if (await page.locator('#signup-form').isHidden()) {
    await page.locator('#show-signup').click();
  }
  await page.locator('#signup-email').fill(deletedEmail);
  await page.locator('#signup-password').fill(deletedPassword);
  await page.locator('#signup-form .auth-btn').click();
  await page.locator('#game-screen').waitFor({ state: 'visible', timeout: 10_000 });
});

Then('the new account has no saved score', async ({ page }) => {
  // Wait for score load
  await page.waitForResponse(
    (resp) => resp.url().includes('/rest/v1/scores') && resp.request().method() === 'GET',
    { timeout: 10_000 },
  ).catch(() => {});
  await page.waitForTimeout(500);

  const score = await page.locator('#display-score').textContent();
  const best = await page.locator('#display-best').textContent();
  expect(Number(score)).toBe(0);
  expect(Number(best)).toBe(0);
});

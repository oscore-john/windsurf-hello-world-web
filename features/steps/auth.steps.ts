import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

let currentEmail = '';
let currentPassword = '';

Given('the user is on the auth screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#auth-screen')).toBeVisible();
});

When('the user switches to the sign-up form', async ({ page }) => {
  await page.locator('#show-signup').click();
  await expect(page.locator('#signup-form')).toBeVisible();
});

When('enters a valid email and password', async ({ page, testUser }) => {
  currentEmail = testUser.email;
  currentPassword = testUser.password;
  await page.locator('#signup-email').fill(testUser.email);
  await page.locator('#signup-password').fill(testUser.password);
});

When('submits the sign-up form', async ({ page }) => {
  await page.locator('#signup-form .auth-btn').click();
});

Given('a user account exists with known credentials', async ({ page, testUser }) => {
  currentEmail = testUser.email;
  currentPassword = testUser.password;
  await page.goto('/');
  await page.locator('#show-signup').click();
  await page.locator('#signup-email').fill(testUser.email);
  await page.locator('#signup-password').fill(testUser.password);
  await page.locator('#signup-form .auth-btn').click();
  await page.locator('#game-screen').waitFor({ state: 'visible' });
  await page.locator('#sign-out-btn').click();
  await page.locator('#auth-screen').waitFor({ state: 'visible' });
});

When('the user enters their email and password', async ({ page }) => {
  await page.locator('#signin-email').fill(currentEmail);
  await page.locator('#signin-password').fill(currentPassword);
});

When('submits the sign-in form', async ({ page }) => {
  await page.locator('#signin-form .auth-btn').click();
});

Then('the game screen is displayed', async ({ page }) => {
  await expect(page.locator('#game-screen')).toBeVisible();
});

Then("the user's email is shown in the header", async ({ page }) => {
  await expect(page.locator('#display-email')).toHaveText(currentEmail);
});

Given('the user is signed in and on the game screen', async ({ page, signedInUser }) => {
  currentEmail = signedInUser.email;
  currentPassword = signedInUser.password;
  await expect(page.locator('#game-screen')).toBeVisible();
});

When('the user clicks the sign-out button', async ({ page }) => {
  await page.locator('#sign-out-btn').click();
});

Then('the auth screen is displayed', async ({ page }) => {
  await expect(page.locator('#auth-screen')).toBeVisible();
});

When('the user enters an incorrect password', async ({ page, testUser }) => {
  currentEmail = testUser.email;
  await page.locator('#signin-email').fill(testUser.email);
  await page.locator('#signin-password').fill('WrongPassword999!');
});

Then('an error message is displayed on the auth screen', async ({ page }) => {
  await expect(page.locator('#auth-error')).not.toBeEmpty();
});

Then('the auth screen remains visible', async ({ page }) => {
  await expect(page.locator('#auth-screen')).toBeVisible();
  await expect(page.locator('#game-screen')).not.toBeVisible();
});

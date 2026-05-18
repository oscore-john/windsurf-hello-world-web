import { test as base } from 'playwright-bdd';

type TestUser = { email: string; password: string };

export const test = base.extend<{ testUser: TestUser; signedInUser: TestUser }>({
  testUser: async ({}, use) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await use({ email: `ci-test-${id}@example.com`, password: 'TestPass123!' });
  },

  signedInUser: async ({ page, testUser }, use) => {
    await page.goto('/');
    await page.locator('#show-signup').click();
    await page.locator('#signup-email').fill(testUser.email);
    await page.locator('#signup-password').fill(testUser.password);
    await page.locator('#signup-form .auth-btn').click();
    await page.locator('#game-screen').waitFor({ state: 'visible' });
    await use(testUser);
  },
});

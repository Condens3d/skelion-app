import { test, expect } from '@playwright/test';

const routes = ['/', '/pentesting', '/grc', '/ciso', '/training', '/licenses', '/physical', '/contact'];

for (const route of routes) {
  test(`route ${route} renders with content`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });
}

test('unknown route renders the branded 404', async ({ page }) => {
  await page.goto('/definitely-not-a-page');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByRole('link', { name: /return_home|retour_accueil/ })).toBeVisible();
});

test('language switcher swaps copy and persists in localStorage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Secure the enterprise.');
  await page.getByRole('button', { name: 'FR' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText("Sécurisez l'entreprise.");
  const stored = await page.evaluate(() => localStorage.getItem('skelion-lang'));
  expect(stored).toBe('fr');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText("Sécurisez l'entreprise.");
});

test('nav routes to a service page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'pentest', exact: true }).click();
  await expect(page).toHaveURL(/\/pentesting/);
  await expect(page.locator('h1')).toBeVisible();
});

test('contact form enforces required fields client-side', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: /transmit_request|transmettre_demande/ }).click();
  const nameValid = await page.locator('#f-name').evaluate((el: HTMLInputElement) => el.validity.valid);
  expect(nameValid).toBe(false);
});

test('contact form submits to the API and confirms', async ({ page }) => {
  await page.goto('/contact');
  await page.locator('#f-name').fill('E2E Tester');
  await page.locator('#f-mail').fill('e2e@example.com');
  await page.locator('#f-msg').fill('Playwright smoke submission.');
  await page.getByRole('button', { name: /transmit_request|transmettre_demande/ }).click();
  await expect(page.getByRole('button', { name: /transmitted_ok|transmission_ok/ })).toBeVisible();
});

test('admin route shows login and rejects bad credentials', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('#a-email')).toBeVisible();
  await page.locator('#a-email').fill('nobody@example.com');
  await page.locator('#a-pass').fill('wrong-password');
  await page.getByRole('button', { name: /authenticate|authentifier/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

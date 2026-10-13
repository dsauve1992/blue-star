import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const frontendDir = resolve(repoRoot, 'apps/frontend');
const storageStatePath = resolve(frontendDir, '.auth/user.json');
const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

process.loadEnvFile(resolve(frontendDir, '.env.local'));
const { E2E_USER_EMAIL, E2E_USER_PASSWORD } = process.env;

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${appUrl}/login`);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.locator('input[type="email"]').fill(E2E_USER_EMAIL);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[type="password"]').fill(E2E_USER_PASSWORD);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await page.waitForURL(`${appUrl}/**`, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');

  mkdirSync(dirname(storageStatePath), { recursive: true });
  await page.context().storageState({ path: storageStatePath });
  console.log(`Logged in, session saved to ${storageStatePath} (${page.url()})`);
} catch (error) {
  const screenshot = resolve(frontendDir, '.auth/login-failure.png');
  mkdirSync(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  console.error(`Login failed at ${page.url()}, screenshot: ${screenshot}`);
  throw error;
} finally {
  await browser.close();
}

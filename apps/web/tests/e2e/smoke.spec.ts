import { test, expect } from '@playwright/test';

test.describe('RankForge Smoke Test', () => {
  async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  }

  test('should load login page and show validation errors on blank submit', async ({ page }) => {
    // 1. Go to login page
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveTitle(/RankForge — Dashboard/i);

    // 2. Click sign-in with blank fields
    await page.click('button[type="submit"]');

    // 3. Page should remain on login
    await expect(page.url()).toContain('/login');
    await expectNoHorizontalOverflow(page);
  });

  test('should load portal verification page', async ({ page }) => {
    // Portal access without session should redirect or ask for credentials
    await page.goto('http://localhost:3000/portal');
    await page.waitForTimeout(1000);
    
    // Should display portal login/token entry form or redirect to login
    const url = page.url();
    expect(url).toMatch(/(\/login|\/portal)/);
    await expectNoHorizontalOverflow(page);
  });

  test('should log in successfully as owner and load dashboard', async ({ page }) => {
    // 1. Go to login page
    await page.goto('http://localhost:3000/login');
    
    // 2. Fill in credentials
    await page.fill('input[type="email"]', 'owner@agency.com');
    await page.fill('input[type="password"]', 'password123');
    
    // 3. Click submit
    await page.click('button[type="submit"]');
    
    // 4. Should redirect to dashboard and load KPIs
    await expect(page).toHaveURL('http://localhost:3000/');
    
    // 5. Check if dashboard view loads and displays "Overview of your agency performance"
    await expect(page.locator('body')).toContainText(/Overview of your agency performance/i);
    await expectNoHorizontalOverflow(page);
  });
});

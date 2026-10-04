const { test, expect } = require('@playwright/test');

test.describe('Smart Parking UI Comprehensive Test', () => {
  test('Check Load, Errors, Layout, and Buttons', async ({ page }) => {
    const consoleErrors = [];
    const networkFailures = [];

    // 1. Listen for Console Errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 2. Listen for Network Failures
    page.on('response', response => {
      if (!response.ok()) {
        networkFailures.push(`Failed URL: ${response.url()} with status ${response.status()}`);
      }
    });

    // 3. Test Page Loading
    await page.goto('http://localhost:3000');
    
    // Check if the main VIP Parking text loads
    await expect(page.locator('text=VIP Parking')).toBeVisible();

    // 4. Test Buttons (Click the first 'Reserve' button)
    const reserveButton = page.locator('button:has-text("Reserve")').first();
    if (await reserveButton.isVisible()) {
      await reserveButton.click();
    }

    // 5. Test Responsive Layout (Switch to Mobile View)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000); // Give it a second to adjust

    // 6. Screenshot & Error Reporting Logic
    if (consoleErrors.length > 0 || networkFailures.length > 0) {
      console.log('⚠️ Issues Found!');
      console.log('Console Errors:', consoleErrors);
      console.log('Network Failures:', networkFailures);
      
      // Take a screenshot of the broken page
      await page.screenshot({ path: 'bug-report-screenshot.png', fullPage: true });
    } else {
      console.log('✅ UI is clean! No console or network errors found.');
      // Take a screenshot of the successful mobile layout
      await page.screenshot({ path: 'mobile-success-layout.png' });
    }
  });
});
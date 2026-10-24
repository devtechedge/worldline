import { expect, test } from '@playwright/test';

test.describe('mobile atlas (390px class)', () => {
  test('map-first layout with no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await expect(page.getByRole('group', { name: /World map/ })).toBeVisible();
    // Rail content sits below the map and is reachable.
    await expect(page.getByLabel('Find a place')).toBeInViewport({ ratio: 0 });
    await page.getByLabel('Find a place').scrollIntoViewIfNeeded();
    await expect(page.getByLabel('Find a place')).toBeVisible();
  });

  test('drawer becomes a bottom sheet with working actions', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Lagos, city/ }).click();
    const sheet = page.getByRole('dialog', { name: /Lagos: place profile/ });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Bookmark' }).click();
    await expect(sheet.getByRole('button', { name: 'Bookmarked' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await sheet.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(sheet).toBeHidden();
  });

  test('layer, horizon and scenario controls work by touch', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Climate', exact: true }).click();
    await expect(page.getByText('Legend · Extreme heat days')).toBeVisible();
    await page.getByRole('radio', { name: '2050' }).click();
    await expect(page.getByRole('radio', { name: '2050' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('radio', { name: 'Strained transition' }).click();
    await expect(page.getByRole('radio', { name: 'Strained transition' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('scenario view is readable and navigates back to the atlas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Scenarios' }).click();
    await expect(page.getByRole('heading', { name: 'Three futures, one model' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    await page.getByRole('button', { name: /Open the atlas with this scenario/ }).click();
    await expect(page.getByRole('group', { name: /World map/ })).toBeVisible();
  });

  test('search and command palette work on mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Find a place').fill('tokyo');
    await page.getByRole('button', { name: /^Tokyo Japan/ }).click();
    await expect(page.getByRole('dialog', { name: /Tokyo: place profile/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Search, opens the command palette|Search/ }).click();
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await palette.getByRole('combobox').fill('reset');
    await palette.getByRole('option', { name: 'Reset atlas view' }).click();
    await expect(palette).toBeHidden();
  });
});

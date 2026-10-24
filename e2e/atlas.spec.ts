import { expect, test } from '@playwright/test';

test.describe('atlas core journeys (desktop)', () => {
  test('loads with masthead, map and rail; no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Worldline' })).toBeVisible();
    await expect(page.getByRole('group', { name: /World map/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cairo, city/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('layer switch updates legend, map encoding and blurb', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Legend · Low-carbon electricity')).toBeVisible();
    await page.getByRole('button', { name: 'Water', exact: true }).click();
    await expect(page.getByText('Legend · Water stress')).toBeVisible();
    await expect(page.getByText('Extreme, 0.85+')).toBeVisible();
    await expect(page.getByRole('group', { name: /World map, Water layer/ })).toBeVisible();
    await expect(page.getByText('Supply, stress, losses and reuse')).toBeVisible();
  });

  test('horizon updates map labels and drawer values together', async ({ page }) => {
    await page.goto('/?l=energy&p=mumbai');
    const mumbai = page.getByRole('button', { name: /^Mumbai, city/ });
    await expect(mumbai).toHaveAttribute('aria-label', /Low-carbon electricity: 30 %/);
    await page.getByRole('radio', { name: '2050' }).click();
    await expect(mumbai).toHaveAttribute('aria-label', /Low-carbon electricity: 7[34] %/);
    await expect(page.getByRole('dialog', { name: /Mumbai: place profile/ })).toBeVisible();
    await expect(page.getByText('Deltas compare 2050')).toBeVisible();
    // The drawer stays live: horizon is reachable while it is open.
    await page.getByRole('radio', { name: '2035' }).click();
    await expect(mumbai).toHaveAttribute('aria-label', /Low-carbon electricity: (4[0-9]|5[0-9]) %/);
  });

  test('place details open by keyboard and Escape restores focus', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('group', { name: /World map/ }).click();
    // Tab from the map container into the first place symbol and activate it.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /place profile/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Why it matters/ })).toBeVisible();
    await expect(page.getByText('Illustrative modelled data', { exact: false }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('compare: add two places, interpretation appears, swap and clear work', async ({ page }) => {
    await page.goto('/?p=cairo');
    await page.getByRole('button', { name: 'Add to compare' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Oslo, city/ }).click();
    await page.getByRole('button', { name: 'Add to compare' }).click();
    const panel = page.getByRole('dialog', { name: /Comparing Cairo and Oslo/ });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/leads on \d+ of \d+ comparable indicators/)).toBeVisible();
    await expect(panel.getByText('Not modelled for this place.').first()).toBeVisible();
    await panel.getByRole('button', { name: 'Swap A / B' }).click();
    const swapped = page.getByRole('dialog', { name: /Comparing Oslo and Cairo/ });
    await expect(swapped).toBeVisible();
    await swapped.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByRole('dialog', { name: /Comparing/ })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Clear comparison' })).toBeHidden();
  });

  test('compare tray keeps one place and prompts for a second', async ({ page }) => {
    await page.goto('/?p=oslo');
    await page.getByRole('button', { name: 'Add to compare' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('group', { name: 'Comparison tray' })).toBeVisible();
    await expect(page.getByText('Pick a second place to compare.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear comparison' }).click();
    await expect(page.getByRole('group', { name: 'Comparison tray' })).toBeHidden();
  });

  test('scenario changes are deterministic and disclosed', async ({ page }) => {
    await page.goto('/?l=energy&p=mumbai');
    await expect(page.getByRole('button', { name: /^Mumbai, city/ })).toHaveAttribute(
      'aria-label',
      /Low-carbon electricity: 30 %/,
    );
    await page.getByRole('radio', { name: '2050' }).click();
    const momentumLabel = await page
      .getByRole('button', { name: /^Mumbai, city/ })
      .getAttribute('aria-label');
    await page.getByRole('radio', { name: 'Strained transition' }).click();
    const strainedLabel = await page
      .getByRole('button', { name: /^Mumbai, city/ })
      .getAttribute('aria-label');
    expect(strainedLabel).not.toBe(momentumLabel);
    // Reload with the same state: values must be identical (deterministic).
    await page.reload();
    await expect(page.getByRole('button', { name: /^Mumbai, city/ })).toHaveAttribute(
      'aria-label',
      strainedLabel!,
    );
    // The scenario reader discloses assumptions.
    await page.getByRole('button', { name: 'Scenarios' }).click();
    await expect(page.getByRole('heading', { name: 'Three futures, one model' })).toBeVisible();
    await expect(page.getByText('The warming trajectory steepens')).toBeVisible();
  });

  test('search finds places and shows the empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Find a place').fill('cair');
    await expect(page.getByRole('button', { name: /^Cairo Egypt/ })).toBeVisible();
    await page.getByLabel('Find a place').fill('zzzz');
    await expect(page.getByText('No places match that search.')).toBeVisible();
  });

  test('bookmarks persist across reload', async ({ page }) => {
    await page.goto('/?p=lagos');
    await page.getByRole('button', { name: 'Bookmark' }).click();
    await expect(page.getByRole('button', { name: 'Bookmarked' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Bookmarked' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Lagos Nigeria/ })).toBeVisible();
  });

  test('URL state restores after refresh and back/forward', async ({ page }) => {
    await page.goto('/?l=connectivity&h=2035&p=tokyo');
    await expect(page.getByRole('dialog', { name: /Tokyo: place profile/ })).toBeVisible();
    await expect(page.getByText('Legend · Median fixed broadband')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog', { name: /Tokyo: place profile/ })).toBeVisible();
    // Back/forward through layer changes
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Climate', exact: true }).click();
    await expect(page.getByText('Legend · Extreme heat days')).toBeVisible();
    await page.goBack();
    await expect(page.getByText('Legend · Median fixed broadband')).toBeVisible();
  });

  test('command palette finds places and switches layers', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    const input = palette.getByRole('combobox');
    await expect(input).toBeFocused();
    await input.fill('dhaka');
    await expect(palette.getByRole('option', { name: /Dhaka/ })).toBeVisible();
    await input.press('Enter');
    await expect(page.getByRole('dialog', { name: /Dhaka: place profile/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    const palette2 = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette2).toBeVisible();
    await expect(palette2.getByRole('combobox')).toBeFocused();
    await palette2.getByRole('combobox').fill('layer: climate');
    await palette2.getByRole('option', { name: 'Layer: Climate' }).click();
    await expect(page.getByText('Legend · Extreme heat days')).toBeVisible();
  });

  test('reset returns layer, horizon and selection to defaults', async ({ page }) => {
    await page.goto('/?l=climate&h=2050&p=phoenix');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Reset atlas view' }).click();
    await expect(page.getByText('Legend · Low-carbon electricity')).toBeVisible();
    await expect(page.getByRole('radio', { name: '2026' })).toHaveAttribute('aria-checked', 'true');
    expect(new URL(page.url()).search).toBe('');
  });

  test('app survives storage failure', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => {
            throw new Error('denied');
          },
          setItem: () => {
            throw new Error('denied');
          },
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          length: 0,
        },
      });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Worldline' })).toBeVisible();
    await expect(page.getByText(/storage is unavailable/)).toBeVisible();
    // Everything else still works.
    await page.getByRole('button', { name: /^Cairo, city/ }).click();
    await expect(page.getByRole('dialog', { name: /Cairo: place profile/ })).toBeVisible();
  });

  test('works with prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('group', { name: /World map/ })).toBeVisible();
    await page.getByRole('button', { name: /^Cairo, city/ }).click();
    await expect(page.getByRole('dialog', { name: /Cairo: place profile/ })).toBeVisible();
    await expect(page.getByText('Illustrative model', { exact: false }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Cairo: place profile/ })).toBeHidden();
  });

  test('drawer indicator table covers all five layers with the missing-data state', async ({ page }) => {
    await page.goto('/?p=suez');
    const dialog = page.getByRole('dialog', { name: /Suez Canal: place profile/ });
    await expect(dialog).toBeVisible();
    for (const group of ['Energy', 'Water', 'Mobility', 'Climate', 'Connectivity']) {
      await expect(dialog.getByRole('heading', { name: group, exact: true })).toBeVisible();
    }
    await expect(dialog.getByText('Not modelled').first()).toBeVisible();
    await expect(dialog.getByText('Delay & closure hours')).toBeVisible();
  });
});

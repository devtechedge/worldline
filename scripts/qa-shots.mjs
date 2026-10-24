/* QA screenshot helper: captures the atlas at the widths the brief requires. */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
mkdirSync('qa-shots', { recursive: true });

const browser = await chromium.launch();

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(BASE, { waitUntil: 'networkidle' });
await desktop.waitForTimeout(700);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-initial.png' });

// Layer switched to Water
await desktop.getByRole('button', { name: 'Water' }).click();
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-water.png' });

// Open a place drawer
await desktop.getByRole('button', { name: /^Cairo, city/ }).click();
await desktop.waitForTimeout(600);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-drawer.png' });

await desktop.keyboard.press('Escape');
await desktop.waitForTimeout(300);

// Horizon 2050
await desktop.getByRole('radio', { name: '2050' }).click();
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-2050.png' });
await desktop.getByRole('radio', { name: '2026' }).click();

// Command palette
await desktop.keyboard.press('Control+k');
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-palette.png' });
await desktop.keyboard.press('Escape');
await desktop.waitForTimeout(200);

// Compare flow: open Cairo, add to compare; open Oslo, add; open comparison
await desktop.getByRole('button', { name: /^Cairo, city/ }).click();
await desktop.getByRole('button', { name: 'Add to compare' }).click();
await desktop.keyboard.press('Escape');
await desktop.waitForTimeout(200);
await desktop.getByRole('button', { name: /^Oslo, city/ }).click();
await desktop.getByRole('button', { name: 'Add to compare' }).click();
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-compare.png' });
await desktop.keyboard.press('Escape'); // close comparison
await desktop.waitForTimeout(200);
await desktop.keyboard.press('Escape'); // close the Oslo drawer
await desktop.waitForTimeout(200);

// Scenario view
await desktop.getByRole('button', { name: 'Scenarios' }).click();
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-scenarios.png' });
await desktop.getByRole('radio', { name: /Strained transition/ }).click();
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-scenarios-strained.png' });

// Field note + methodology from the atlas
await desktop.getByRole('button', { name: 'Atlas', exact: true }).click();
await desktop.getByRole('button', { name: 'Field note' }).click();
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-fieldnote.png' });
await desktop.keyboard.press('Escape');
await desktop.getByRole('button', { name: 'Methodology' }).click();
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'qa-shots/desktop-1440-methodology.png' });
await desktop.keyboard.press('Escape');


const laptop = await browser.newPage({ viewport: { width: 1024, height: 768 } });
await laptop.goto(BASE, { waitUntil: 'networkidle' });
await laptop.waitForTimeout(500);
await laptop.screenshot({ path: 'qa-shots/laptop-1024.png' });

const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 } });
await tablet.goto(BASE, { waitUntil: 'networkidle' });
await tablet.waitForTimeout(500);
await tablet.screenshot({ path: 'qa-shots/tablet-768.png' });

const mobile = await browser.newPage({ ...devices['Pixel 7'] });
await mobile.goto(BASE, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: 'qa-shots/mobile-390-initial.png' });

// Mobile: overflow check + drawer
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('mobile horizontal overflow px:', overflow);
await mobile.getByRole('button', { name: /^Lagos, city/ }).click();
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: 'qa-shots/mobile-390-drawer.png' });

const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('mobile drawer overflow px:', mobileOverflow);

const small = await browser.newPage({ viewport: { width: 360, height: 740 } });
await small.goto(BASE, { waitUntil: 'networkidle' });
await small.waitForTimeout(500);
const smallOverflow = await small.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('360px overflow px:', smallOverflow);
await small.screenshot({ path: 'qa-shots/mobile-360.png' });

await browser.close();
console.log('done');

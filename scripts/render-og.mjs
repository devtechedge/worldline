import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const file = pathToFileURL(resolve('scripts/og-card.html')).href;
await page.goto(file);
await page.waitForTimeout(400);
await page.screenshot({ path: 'public/og-card.png' });
await browser.close();
console.log('og-card written');

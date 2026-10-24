import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
await page.goto(pathToFileURL(resolve('scripts/og-card-social.html')).href);
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/social-preview.jpg', type: 'jpeg', quality: 88 });
await browser.close();
console.log('social preview written');

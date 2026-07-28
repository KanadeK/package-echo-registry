import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { startBuiltPreview } from './previewHarness.js';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(repositoryRoot, 'docs', 'assets', 'dashboard.png');

await mkdir(path.dirname(output), { recursive: true });
const preview = await startBuiltPreview(repositoryRoot);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    colorScheme: 'light',
    reducedMotion: 'reduce',
    viewport: {
      height: 1080,
      width: 1440,
    },
  });
  await page.goto(preview.baseURL, { waitUntil: 'domcontentloaded' });
  await page.getByText('11 matching results').waitFor();
  await page.screenshot({
    animations: 'disabled',
    fullPage: false,
    path: output,
  });
  process.stdout.write(`Captured ${output}\n`);
} finally {
  await browser.close();
  await preview.close();
}

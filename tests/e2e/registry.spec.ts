import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads real fixture evidence and passes an automated accessibility scan', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Downstream impact report' })).toBeVisible();
  await expect(
    page.getByText('Packages').locator('..').getByText('5', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Impacts').locator('..').getByText('11', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('impact-graph')).toBeVisible();
  await expect(page.getByText('apps/catalog/src/main.tsx:1')).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('supports keyboard graph focus, compound filters, and checklist state', async ({ page }) => {
  await page.goto('/');

  const reactNode = page.getByRole('button', {
    name: 'Focus impacts involving @echo/react',
  });
  await reactNode.focus();
  await page.keyboard.press('Enter');
  await expect(reactNode).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Clear node focus' })).toBeVisible();

  await page.getByLabel('Severity').selectOption('high');
  await page.getByLabel('Risk').selectOption('peer-dependency');
  await expect(page.getByText('1 matching results')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Impact explorer' }).getByRole('button', {
      name: /^high @echo\/react/,
    }),
  ).toHaveCount(1);

  await page.getByRole('checkbox').first().check();
  await expect(page.getByText('1 of 11 reviewed in this session')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('0 of 11 reviewed in this session')).toBeVisible();
});

test('recovers from network and import failures, then exports both report formats', async ({
  page,
}) => {
  await page.route('**/demo-report.json', (route) =>
    route.fulfill({
      body: '{}',
      contentType: 'application/json',
      status: 503,
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');

  await page.unroute('**/demo-report.json');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('11 matching results')).toBeVisible();

  const fileInput = page.locator('#report-file');
  await fileInput.setInputFiles({
    buffer: Buffer.from('{}'),
    mimeType: 'application/json',
    name: 'broken-report.json',
  });
  await expect(page.getByRole('alert')).toContainText('does not match the report schema');

  await fileInput.setInputFiles('public/demo-report.json');
  await expect(page.getByRole('alert')).toHaveCount(0);

  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  const jsonPath = await jsonDownload.path();
  expect(jsonDownload.suggestedFilename()).toBe('package-echo-report.json');
  expect(JSON.parse(await readFile(jsonPath!, 'utf8'))).toMatchObject({
    summary: { impacts: 11 },
  });

  const [markdownDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Markdown' }).click(),
  ]);
  const markdownPath = await markdownDownload.path();
  expect(markdownDownload.suggestedFilename()).toBe('package-echo-report.md');
  expect(await readFile(markdownPath!, 'utf8')).toContain('## Migration checklist');
});

test('keeps the application responsive at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
  await expect(page.getByText('11 matching results')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

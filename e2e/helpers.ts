import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Clicks a sample-data pill on the Add Data step and waits for the files
 * to appear before continuing. */
export async function loadSample(page: Page, company: 'Walmart' | 'Shopee' | 'Shein') {
  await page.getByRole('button', { name: company, exact: true }).click()
  await expect(page.getByRole('heading', { name: /Added files/ })).toBeVisible()
}

/** Clicks the Amazon sample pill (labeled "Amazon (catalog only)", so it's
 * located by test ID rather than exact accessible name). */
export async function loadAmazonSample(page: Page) {
  await page.getByTestId('sample-pill-amazon').click()
  await expect(page.getByRole('heading', { name: /Added files/ })).toBeVisible()
}

export async function continueToConfirm(page: Page) {
  await page.getByRole('button', { name: 'Continue to confirm data' }).click()
  await expect(page.getByRole('heading', { name: 'Confirm your data' })).toBeVisible()
}

export async function analyze(page: Page) {
  await page.getByRole('button', { name: 'Analyze products' }).click()
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
}

/** Loads a full sample and runs the full pipeline through to Insights. */
export async function loadSampleAndAnalyze(page: Page, company: 'Walmart' | 'Shopee' | 'Shein') {
  await loadSample(page, company)
  await continueToConfirm(page)
  await analyze(page)
}

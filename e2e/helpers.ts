import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Clicks a sample-data pill on the Add Data step and waits for the files
 * to appear before continuing. */
export async function loadSample(page: Page, company: 'Amazon' | 'Walmart' | 'Shopee' | 'Shein' | 'Lazada') {
  await page.getByRole('button', { name: company, exact: true }).click()
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
export async function loadSampleAndAnalyze(page: Page, company: 'Amazon' | 'Walmart' | 'Shopee' | 'Shein' | 'Lazada') {
  await loadSample(page, company)
  await continueToConfirm(page)
  await analyze(page)
}

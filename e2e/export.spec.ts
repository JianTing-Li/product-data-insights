import { expect, test } from '@playwright/test'
import { loadSampleAndAnalyze } from './helpers'

test('export', async ({ page }) => {
  await page.goto('/')
  await loadSampleAndAnalyze(page, 'Walmart')

  // Product-attention CSV, from Overview.
  const [attentionDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).first().click(),
  ])
  expect(attentionDownload.suggestedFilename()).toBe('product-attention.csv')

  // Clean product-performance CSV, from All products.
  await page.getByRole('tab', { name: 'All products' }).click()
  const [performanceDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(performanceDownload.suggestedFilename()).toBe('product-performance.csv')

  // Data-quality summary CSV and a per-category (rejected rows) CSV.
  await page.getByRole('tab', { name: 'Data quality' }).click()
  const [summaryDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export summary' }).click(),
  ])
  expect(summaryDownload.suggestedFilename()).toBe('data-quality-summary.csv')

  const rejectedRowsCard = page.getByTestId('data-quality-card-rejectedRows')
  const [rejectedDownload] = await Promise.all([
    page.waitForEvent('download'),
    rejectedRowsCard.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(rejectedDownload.suggestedFilename()).toBe('rejectedRows.csv')
})

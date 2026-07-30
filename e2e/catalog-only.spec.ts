import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { analyze, continueToConfirm } from './helpers'

const dirname = path.dirname(fileURLToPath(import.meta.url))

test('catalog-only analysis when only a product file is uploaded', async ({ page }) => {
  await page.goto('/')

  const filePath = path.resolve(dirname, '../public/sample-data/amazon-products.csv')
  await page.locator('input[type="file"]').setInputFiles(filePath)
  await expect(page.getByRole('heading', { name: /Added files/ })).toBeVisible()

  await continueToConfirm(page)
  await analyze(page)

  // Catalog-only KPI cards, not revenue/sales metrics.
  await expect(page.getByTestId('kpi-card-Product count')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Pricing concerns')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Reputation concerns')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Data-quality issues')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Revenue')).toHaveCount(0)

  // Explains what unlocks more insights.
  await expect(page.getByText(/Add sales data to unlock/)).toBeVisible()
  await expect(page.getByText(/Add inventory data to unlock/)).toBeVisible()

  // No performance chart in catalog-only mode.
  await expect(page.getByText('Performance', { exact: true })).toHaveCount(0)
})

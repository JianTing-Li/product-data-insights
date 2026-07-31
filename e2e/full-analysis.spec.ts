import { expect, test } from '@playwright/test'
import { loadSampleAndAnalyze } from './helpers'

test('full product, sales, and inventory analysis', async ({ page }) => {
  await page.goto('/')

  await loadSampleAndAnalyze(page, 'Walmart')

  // Overview: KPI cards render with real numbers.
  await expect(page.getByTestId('kpi-card-Revenue')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Orders')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Units sold')).toBeVisible()
  await expect(page.getByTestId('kpi-card-Average order value')).toBeVisible()

  // Attention summary and highest-priority products.
  await expect(page.getByText(/products need attention/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Highest-priority products' })).toBeVisible()

  // Open a product detail and walk through progressive disclosure.
  // Accessible name is "Inspect <product name>", not a fixed generic string.
  await page.getByRole('button', { name: /^Inspect / }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Evidence — all signals/)).toBeVisible()

  await dialog.getByText('Calculations', { exact: true }).click()
  await expect(dialog.getByText('Average order value', { exact: true })).toBeVisible()

  await dialog.getByText(/Source records/).click()
  await expect(dialog.getByText(/Sales —|No source rows/)).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()

  // All products view shows the full table.
  await page.getByRole('tab', { name: 'All products' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByPlaceholder('Search by product name or SKU')).toBeVisible()

  // Data quality view shows real detected issues.
  await page.getByRole('tab', { name: 'Data quality' }).click()
  await expect(page.getByText('Unmatched product IDs')).toBeVisible()
  await expect(page.getByText('Rejected rows')).toBeVisible()
})

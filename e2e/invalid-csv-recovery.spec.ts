import { expect, test } from '@playwright/test'

test('invalid CSV recovery', async ({ page }) => {
  await page.goto('/')

  // A non-CSV file: no columns can be detected.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('this is not a csv, just plain text with no commas'),
  })
  await expect(page.getByText(/No columns could be detected|No data rows were found/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm data' })).toBeDisabled()

  // An empty CSV file: no header row at all.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'empty.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(''),
  })
  await expect(page.getByText(/No columns could be detected/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm data' })).toBeDisabled()

  // Recovery: picking a sample instead replaces the invalid files entirely —
  // selecting a company sample always gives a clean, single-company slate
  // rather than mixing in unrelated (or broken) previously-added files.
  await page.getByRole('button', { name: 'Walmart', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm data' })).toBeEnabled()
  await expect(page.getByText('notes.txt', { exact: true })).toHaveCount(0)
  await expect(page.getByText('empty.csv', { exact: true })).toHaveCount(0)
  await expect(page.getByText('walmart-sales.csv', { exact: true })).toBeVisible()
  await expect(page.getByText('walmart-products.csv', { exact: true })).toBeVisible()
  await expect(page.getByText('walmart-inventory.csv', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Confirm data' }).click()
  await expect(page.getByRole('heading', { name: 'Confirm your data' })).toBeVisible()
  // The invalid files were cleared, not carried forward, so there's nothing to skip.
  await expect(page.getByText(/couldn't be read and will be skipped/)).toHaveCount(0)
})

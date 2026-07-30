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
  await expect(page.getByRole('button', { name: 'Continue to confirm data' })).toBeDisabled()

  // An empty CSV file: no header row at all.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'empty.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(''),
  })
  await expect(page.getByText(/No columns could be detected/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to confirm data' })).toBeDisabled()

  // Recovery: adding a real sample afterward still works, error files remain listed.
  await page.getByRole('button', { name: 'Amazon', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continue to confirm data' })).toBeEnabled()
  await expect(page.getByText('notes.txt')).toBeVisible()
  await expect(page.getByText('empty.csv')).toBeVisible()

  await page.getByRole('button', { name: 'Continue to confirm data' }).click()
  await expect(page.getByRole('heading', { name: 'Confirm your data' })).toBeVisible()
  // The unreadable files are skipped, not silently lost — the user is told.
  await expect(page.getByText(/couldn't be read and will be skipped/)).toBeVisible()
})

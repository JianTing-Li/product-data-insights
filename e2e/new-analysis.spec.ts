import { expect, test } from '@playwright/test'
import { loadSampleAndAnalyze } from './helpers'

test('new analysis cancellation and confirmation', async ({ page }) => {
  await page.goto('/')
  await loadSampleAndAnalyze(page, 'Walmart')

  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()

  // Cancel: the confirmation dialog appears, but declining preserves all state.
  await page.getByRole('button', { name: 'New analysis' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/clears all added files, mappings, results/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()

  // Confirm: state is cleared and the app returns to step 1 without a page reload.
  await page.getByRole('button', { name: 'New analysis' }).click()
  await page.getByRole('button', { name: 'Start new analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Add your data' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to confirm data' })).toBeDisabled()
})

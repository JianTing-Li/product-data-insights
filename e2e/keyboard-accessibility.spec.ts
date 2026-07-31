import { expect, test } from '@playwright/test'

test('keyboard operability of the Add Data step', async ({ page }) => {
  await page.goto('/')

  // Tab order: skip link, then the dropzone — the hidden file input inside it
  // must not be an extra, confusing tab stop.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Drop CSV files here/ })).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Walmart', exact: true })).toBeFocused()

  // Enter activates a focused sample button.
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /Added files/ })).toBeVisible()

  // Continue button is keyboard-reachable and Enter-activatable.
  await page.getByRole('button', { name: 'Confirm data' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Confirm your data' })).toBeVisible()
})

test('Escape closes the product detail dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Walmart', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm data' }).click()
  await page.getByRole('button', { name: 'Analyze' }).click()

  // Accessible name is "Inspect <product name>", not a fixed generic string.
  await page.getByRole('button', { name: /^Inspect / }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

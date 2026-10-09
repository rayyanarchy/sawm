import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fixtureName } from '../src/core/testing/fixtureName.ts'

// Serve the same recorded responses the app core's tests use, at the moment they were recorded for.
test.beforeEach(async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-10-04T06:00:00Z') })
  await context.route(/photon\.komoot\.io|api\.aladhan\.com/, async (route) => {
    const file = new URL(`../src/core/testing/fixtures/${fixtureName(route.request().url())}`, import.meta.url)
    await route.fulfill({ json: JSON.parse(await readFile(file, 'utf8')) })
  })
})

async function setUp(page: Page) {
  await page.goto('/')
  await page.getByPlaceholder('City or town').fill('Karachi')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('button', { name: /Karachi\s*Sindh, Pakistan/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByText('Suhoor', { exact: true })).toBeVisible()
}

test("sets up from a city search and shows today's times", async ({ page }) => {
  await setUp(page)
  await expect(page.locator('time').first()).toHaveText(/5:09/)
  await expect(page.getByText('Next fast', { exact: true })).toBeVisible()
})

test('has a valid web app manifest', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Sawm', display: 'standalone', start_url: '/' })
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true)
})

test('opens Today offline after a first visit', async ({ page, context }) => {
  await setUp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // so the service worker controls the page
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('time').first()).toHaveText(/5:09/)
})

test('has no serious accessibility problems', async ({ page }) => {
  await setUp(page)
  for (const path of ['/', '/calendar', '/settings']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([])
  }
})

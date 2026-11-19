import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'

const base = (process.env.PRAMITI_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
let browser

before(async () => {
  browser = await chromium.launch({ channel: process.env.PRAMITI_CHROME_CHANNEL || undefined })
})
after(async () => browser?.close())

test('public landing, overview, and mobile dashboard render', { timeout: 20000 }, async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  try {
    await page.goto(base)
    assert.match(await page.locator('h1').innerText(), /Proof of Intent/)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    const overview = await page.getByRole('link', { name: 'Project overview' }).getAttribute('href')
    assert.match(await (await page.request.get(base + overview)).text(), /Competition overview/)
    await page.getByRole('link', { name: 'Launch sandbox' }).click()
    await page.getByText('Sandbox connected').waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.equal(await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link').count(), 6)
    assert.equal((await (await page.request.get(base + '/health')).json()).status, 'ok')
  } finally {
    await page.context().close()
  }
})

test('browser signing, three scenarios, human review, and evidence verification', { timeout: 30000 }, async () => {
  const page = await browser.newPage()
  const uncaught = []
  page.on('pageerror', error => uncaught.push(error.message))
  try {
    await page.goto(base + '/#mandates')
    await page.getByLabel('I authorize the simulated spending terms above.').check()
    await page.getByRole('button', { name: 'Sign and approve mandate' }).click()
    await page.getByRole('heading', { name: 'Run shopper' }).waitFor()
    for (const [scenario, decision] of [
      ['Legitimate payment', 'ALLOW'],
      ['Policy violation', 'REJECT'],
      ['Suspicious substitution', 'ESCALATE'],
    ]) {
      await page.getByRole('button', { name: new RegExp(scenario) }).click()
      await page.getByRole('heading', { name: 'Payment Verification' }).waitFor()
      await page.locator('.content .section-line .badge').first().filter({ hasText: decision }).waitFor()
      if (decision === 'ALLOW' && process.env.PRAMITI_EXPECT_SEMANTIC === '1') {
        await page.getByText('Prediction set {conformant}', { exact: true }).waitFor()
      }
      if (decision !== 'ESCALATE') await page.getByRole('link', { name: 'AI Shopping Agent' }).click()
    }
    await page.getByText('Product evidence · merchant claim only').waitFor()
    await page.getByText('Unverified requirements · 65w').waitFor()
    await page.getByRole('link', { name: 'Open human review' }).click()
    const approve = page.getByRole('button', { name: 'Approve simulated settlement' })
    assert.equal(await approve.isEnabled(), false)
    await page.getByLabel('Reviewer note').fill('Sandbox reviewer checked synthetic inspection record.')
    await approve.click()
    await page.getByText('Review approved', { exact: false }).waitFor()
    await page.getByRole('link', { name: 'Evidence Explorer' }).click()
    const head = (await page.locator('.digest').innerText()).split('\n').at(-1)
    await page.getByText('agent observations', { exact: true }).first().waitFor()
    await page.getByLabel('Trusted checkpoint').fill(head)
    await page.getByRole('button', { name: 'Verify chain' }).click()
    await page.getByRole('status').getByText('Evidence chain and checkpoint verified.').waitFor()
    await page.reload()
    await page.getByText(head, { exact: false }).first().waitFor()
    const privateKeyExtractable = await page.evaluate(async () => new Promise(resolve => {
      const open = indexedDB.open('pramiti', 1)
      open.onsuccess = () => {
        const get = open.result.transaction('keys').objectStore('keys').get('demo')
        get.onsuccess = () => resolve(get.result?.privateKey.extractable)
      }
    }))
    assert.equal(privateKeyExtractable, false)
    assert.deepEqual(uncaught, [])
  } finally {
    await page.context().close()
  }
})

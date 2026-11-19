import assert from 'node:assert/strict'

export const base = (process.env.PRAMITI_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
export const ready = async page => {
  await page.locator('#workspace-main .loading-state').waitFor({state:'hidden'})
  const failure = await page.locator('.product-content > [role="alert"]').allTextContents()
  assert.deepEqual(failure, [])
}

export async function go(page, route, name) {
  await page.goto(base + (route ? '/#' + route : '/'), {waitUntil:'domcontentloaded'})
  await page.getByRole('heading', {level:1,name}).waitFor()
  if (route) await ready(page)
  await page.evaluate(()=>window.scrollTo(0,0))
}

export async function signDefault(page, { validation = false, receipt } = {}) {
  await go(page, 'mandates?next=demo', 'Intent mandates')
  if (validation) {
    await page.getByLabel('Shopping instruction').fill('')
    await page.getByRole('button',{name:'Continue to constraints'}).click()
    await page.getByRole('alert').getByText('Check the following fields').waitFor()
    assert.equal(await page.getByLabel('Shopping instruction').getAttribute('aria-invalid'),'true')
    await page.getByRole('button',{name:'Use sample intent'}).click()
  }
  await page.getByRole('button',{name:'Continue to constraints'}).click()
  await page.getByRole('heading',{name:'Review structured policy',exact:true}).waitFor()
  if (validation) {
    await page.getByLabel('Single-payment limit').fill('7500000')
    await page.getByRole('button',{name:'Review mandate'}).click()
    await page.getByRole('alert').getByText('Check the following fields').waitFor()
    await page.getByLabel('Single-payment limit').fill('3000')
  }
  await page.getByRole('button',{name:'Review mandate'}).click()
  await page.getByRole('heading',{name:'Verify and sign',exact:true}).waitFor()
  if (validation) {
    const mandates = await (await page.request.get(base+'/api/mandates')).json()
    assert.equal(mandates.length,0)
    await page.getByRole('button',{name:'Sign and approve mandate'}).click()
    await page.getByRole('alert').getByText('Check the following fields').waitFor()
  }
  await page.getByLabel('I authorize the simulated spending terms above.').check()
  await page.getByRole('button',{name:'Sign and approve mandate'}).click()
  await page.getByRole('heading',{name:'Confirmation',exact:true}).waitFor()
  await page.getByText('Mandate signed',{exact:true}).waitFor()
  if (receipt) await receipt()
  await page.getByRole('link',{name:'Continue to demonstration'}).click()
  await page.getByRole('heading',{level:1,name:'Live Demo'}).waitFor()
}

export async function runDemo(page, scenario, expected) {
  if (!page.url().endsWith('/#demo')) await go(page,'demo','Live Demo')
  await page.getByRole('button',{name:'Run '+scenario,exact:true}).click()
  await page.waitForURL(/#demo\?tx=[\w-]+$/)
  await page.getByRole('link',{name:'Inspect transaction',exact:true}).click()
  await page.waitForURL(/#verification\?tx=[\w-]+$/)
  await page.getByRole('heading',{level:1,name:'Transactions'}).waitFor()
  await page.locator('.decision-hero .status-tag').first().filter({hasText:expected}).waitFor()
  return new URLSearchParams(page.url().split('?')[1]).get('tx')
}

export async function populate(page) {
  await signDefault(page)
  await runDemo(page,'Legitimate payment','Approved')
  await runDemo(page,'Policy violation','Rejected')
  return runDemo(page,'Suspicious substitution','Human review')
}

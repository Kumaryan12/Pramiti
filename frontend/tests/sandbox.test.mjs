import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'
import { base, go, populate, runDemo, signDefault } from './flow.mjs'

let browser
before(async () => { browser = await chromium.launch({ channel: process.env.PRAMITI_CHROME_CHANNEL || undefined }) })
after(async () => browser?.close())

test('public landing, mobile drawer, theme, and original deep links', { timeout: 30000 }, async () => {
  const page = await browser.newPage({viewport:{width:390,height:844}})
  try {
    await go(page,'',/Autonomous payments/i)
    const overview = await page.request.get(base+'/overview.html')
    assert.match(await overview.text(), /Competition overview/)
    await page.getByRole('link',{name:'Launch Interactive Demo'}).first().click()
    await page.getByRole('heading',{level:1,name:'Live demonstration'}).waitFor()
    const toggle = page.getByRole('button',{name:'Open navigation'})
    await toggle.focus()
    await toggle.press('Enter')
    await page.getByRole('dialog',{name:'Workspace navigation'}).waitFor()
    assert.equal(await page.getByRole('navigation',{name:'Workspace'}).getByRole('link').count(),11)
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({state:'hidden'})
    await toggle.click()
    await page.getByRole('link',{name:'Dashboard',exact:true}).click()
    await page.getByRole('heading',{level:1,name:'Risk dashboard'}).waitFor()
    await page.getByRole('button',{name:'Use dark theme'}).click()
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark')
    await page.reload()
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await go(page,'agent','AI agent workspace')
    await go(page,'transactions','Transactions')
    assert.equal((await (await page.request.get(base+'/health')).json()).status,'ok')
  } finally { await page.context().close() }
})

test('signing, three real decisions, review confirmation, and evidence export', { timeout: 55000 }, async () => {
  const page = await browser.newPage({acceptDownloads:true})
  const uncaught=[]
  page.on('pageerror',error=>uncaught.push(error.message))
  try {
    await signDefault(page,{validation:true})
    await runDemo(page,'Legitimate payment','Approved')
    if(process.env.PRAMITI_EXPECT_SEMANTIC==='1') await page.getByTestId('prediction-set').filter({hasText:'{conformant}'}).waitFor()
    await page.getByText('Simulated settlement reference',{exact:true}).waitFor()
    await runDemo(page,'Policy violation','Rejected')
    await page.getByText('The proposed amount must fit the signed per-payment limit.').first().waitFor()
    const id=await runDemo(page,'Suspicious substitution','Human review')
    await page.getByText('Merchant claim only',{exact:true}).waitFor()
    await page.getByText('Unverified requirements',{exact:true}).waitFor()
    await page.getByRole('link',{name:'Open human review'}).click()
    await page.getByRole('heading',{level:1,name:'Human review'}).waitFor()
    const approve=page.getByRole('button',{name:'Approve simulated settlement'})
    assert.equal(await approve.isEnabled(),false)
    await page.getByLabel('Reviewer note').fill('Sandbox reviewer checked a synthetic inspection record.')
    await approve.click()
    await page.getByRole('dialog',{name:'Approve this simulated settlement?'}).waitFor()
    await page.getByRole('button',{name:'Cancel',exact:true}).click()
    await page.getByRole('dialog').waitFor({state:'hidden'})
    await approve.click()
    await page.getByRole('button',{name:'Confirm approval'}).click()
    await page.getByRole('status').getByText('Review approved. Simulated settlement recorded.').waitFor()
    await go(page,'evidence?tx='+id,'Evidence explorer')
    await page.locator('.timeline').getByText('Agent observations',{exact:true}).first().waitFor()
    const request=await (await page.request.get(base+'/api/evidence')).json()
    const exportEvent=page.waitForEvent('download')
    await page.getByRole('button',{name:'Export visible events'}).click()
    const file=await exportEvent
    const exported=JSON.parse(await readFile(await file.path(),'utf8'))
    assert.equal(exported.head,request.head)
    assert.equal(exported.transaction_id,id)
    assert.ok(exported.events.some(event=>event.action==='human_review'))
    await page.getByRole('link',{name:'Verify ledger'}).click()
    await page.getByLabel('Trusted checkpoint').fill(request.head)
    await page.getByRole('button',{name:'Verify chain',exact:true}).click()
    await page.getByRole('status').getByText('Evidence chain and checkpoint verified.').waitFor()
    await page.getByLabel('Trusted checkpoint').fill('a'.repeat(64))
    await page.getByRole('button',{name:'Verify chain',exact:true}).click()
    await page.getByRole('status').getByText('Checkpoint unavailable',{exact:true}).waitFor()
    await page.reload()
    await page.getByText(request.head,{exact:true}).first().waitFor()
    const privateKeyExtractable=await page.evaluate(()=>new Promise(resolve=>{
      const open=indexedDB.open('pramiti',1)
      open.onsuccess=()=>{
        const get=open.result.transaction('keys').objectStore('keys').get('demo')
        get.onsuccess=()=>resolve(get.result?.privateKey.extractable)
      }
    }))
    assert.equal(privateKeyExtractable,false)
    assert.deepEqual(uncaught,[])
  } finally { await page.context().close() }
})

test('laboratory runs a real scenario and analytics uses recorded experiments', {timeout:35000},async()=>{
  const page=await browser.newPage()
  try {
    await signDefault(page)
    await go(page,'lab','Attack laboratory')
    await page.getByRole('button',{name:'Run suspicious substitution',exact:true}).click()
    const outcome=page.getByRole('heading',{name:'Latest recorded shopper run'})
    await outcome.waitFor()
    await page.getByRole('link',{name:'Inspect recorded outcome'}).click()
    await page.locator('.decision-hero .status-tag').first().filter({hasText:'Human review'}).waitFor()
    await page.getByRole('link',{name:'Open human review'}).click()
    await page.getByRole('button',{name:'Reject',exact:true}).click()
    await page.getByRole('button',{name:'Confirm rejection'}).click()
    await page.getByRole('status').getByText('Review recorded. Transaction rejected.').waitFor()
    await go(page,'analytics?family=replay','Evaluation analytics')
    assert.equal(await page.getByLabel('Attack family').inputValue(),'replay')
    await page.getByLabel('Matched review budget').selectOption('1')
    await page.getByRole('region',{name:'Matched review rates'}).getByText('Basic authorization').waitFor()
    const link=await page.getByRole('link',{name:'Download metrics JSON'}).getAttribute('href')
    const metrics=await (await page.request.get(link)).json()
    assert.equal(metrics.overall.PRAMITI.total,1320)
    assert.equal(await page.getByRole('img',{name:'Unsafe auto-approval by human-review rate'}).count(),1)
  } finally { await page.context().close() }
})

test('axe WCAG 2.2 A/AA checks on critical desktop and mobile views', {timeout:95000},async()=>{
  const all=[]
  const check=async(page,name)=>{
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()
    for(const violation of results.violations) all.push({name,id:violation.id,impact:violation.impact,nodes:violation.nodes.map(node=>node.target)})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), name+' overflows the viewport')
  }
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const page=await context.newPage()
  try {
    await go(page,'',/Autonomous payments/i)
    await check(page,'landing')
    await populate(page)
    for(const [route,title] of [['dashboard','Risk dashboard'],['mandates','Intent mandates'],['agent','AI agent workspace'],['verification','Transactions'],['review','Human review'],['evidence','Evidence explorer'],['ledger','Ledger verification'],['analytics','Evaluation analytics'],['lab','Attack laboratory']]){
      await go(page,route,title)
      await check(page,route)
    }
    await page.setViewportSize({width:390,height:844})
    await go(page,'review','Human review')
    await check(page,'mobile review')
    await page.getByRole('button',{name:'Open navigation'}).click()
    await check(page,'mobile drawer')
    await page.keyboard.press('Escape')
    await page.getByRole('button',{name:'Use dark theme'}).click()
    await go(page,'dashboard','Risk dashboard')
    await check(page,'mobile dark dashboard')
    assert.deepEqual(all,[])
  } finally { await page.context().close() }
})

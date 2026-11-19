import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { go, runDemo, signDefault } from './flow.mjs'

const output=resolve(process.env.PRAMITI_SCREENSHOT_DIR || '../docs/ui-screenshots/assurance-after')
await mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:process.env.PRAMITI_CHROME_CHANNEL || undefined})
try {
  for(const [device,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'})
    const page=await context.newPage()
    const capture=async name=>{
      await page.evaluate(()=>document.fonts.ready)
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error(device+' overflow on '+name)
      await page.screenshot({path:output+'/'+device+'-'+name+'.png',animations:'disabled'})
    }
    await go(page,'',/Autonomous payments/i)
    await capture('landing')
    await page.locator('.architecture').scrollIntoViewIfNeeded()
    await capture('architecture')
    await go(page,'dashboard','Command Centre')
    await capture('dashboard')
    await go(page,'mandates','Intent mandates')
    await capture('mandates')
    await signDefault(page,{receipt:()=>capture('mandate-receipt')})
    await capture('demo')
    await runDemo(page,'Legitimate payment','Approved')
    await runDemo(page,'Policy violation','Rejected')
    const tx=await runDemo(page,'Suspicious substitution','Human review')
    await capture('verification')
    await go(page,'demo?tx='+tx,'Live Demo')
    await capture('demo-with-decision')
    await page.locator('.journey-grid').scrollIntoViewIfNeeded()
    await capture('demo-record')
    for(const [route,title,name] of [['agent','AI Agent','agent'],['review?tx='+tx,'Human review','review'],
      ['evidence?tx='+tx,'Evidence explorer','evidence'],['ledger','Ledger Integrity','ledger'],['analytics','Evaluation analytics','analytics'],
      ['lab','Attack laboratory','lab'],['documentation','Technical Documentation','documentation'],['dashboard','Command Centre','dashboard-with-data']]){
      await go(page,route,title)
      await capture(name)
      if(name==='review'){
        await page.locator('.review-controls').scrollIntoViewIfNeeded()
        await capture('review-controls')
      }
    }
    if(device==='mobile'){
      await page.getByRole('button',{name:'Open navigation'}).click()
      await capture('drawer')
    }
    if(device==='desktop'){
      await page.getByRole('button',{name:'Use dark theme'}).click()
      await capture('dark-dashboard')
    }
    await context.close()
  }
} finally { await browser.close() }

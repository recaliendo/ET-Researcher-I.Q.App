// End-to-end frontend checks against a running server (default http://127.0.0.1:3001).
// Uses the existing @playwright/test dev dependency and drives the installed Microsoft Edge (no browser download) and runs axe-core WCAG 2.2 A/AA on every page,
// in light and dark themes, at 1440, 768, 375 and 320 px. Also checks horizontal overflow and the core
// user tasks from the design brief. Usage: npx tsx scripts/e2e.ts [baseUrl] [--screenshots dir]
import {chromium,type Page} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';

const base=(process.argv[2]&&!process.argv[2].startsWith('--'))?process.argv[2]:'http://127.0.0.1:3001';
const shotDir=process.argv.includes('--screenshots')?process.argv[process.argv.indexOf('--screenshots')+1]:'';
// axe-core arrives with the @axe-core/playwright dev dependency (pnpm keeps it out of the top-level tree).
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js',{paths:[path.dirname(require.resolve('@axe-core/playwright'))]}),'utf8');
const pages=['/','/feed','/cases','/cases/E001','/findings','/statistics','/psychology','/protection','/priorities','/methodology','/mars'];
const widths=[1440,768,375,320];
const failures:string[]=[];let checks=0;
const fail=(m:string)=>{failures.push(m);console.log('FAIL',m);};

async function ready(page:Page){await page.waitForSelector('main',{timeout:20000});await page.waitForFunction(()=>!document.querySelector('.loading-state'),undefined,{timeout:20000});await page.waitForTimeout(300);}
async function audit(page:Page,label:string){
 await page.addScriptTag({content:axeSource});
 const v=await page.evaluate(async()=>(await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map((x:any)=>`${x.id} (${x.nodes.length}) ${x.nodes[0].target.join(' ')}`));
 checks++;if(v.length)fail(`${label}: ${v.join('; ')}`);
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 checks++;if(over>1)fail(`${label}: horizontal overflow ${over}px`);
}

async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const theme of ['light','dark'] as const)for(const width of widths){
   const ctx=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});
   await ctx.addInitScript(t=>{try{localStorage.setItem('et-theme',t);}catch{}},theme);
   const page=await ctx.newPage();
   for(const p of pages){
    await page.goto(base+p);await ready(page);
    if(p==='/protection')await page.getByRole('button',{name:'Open the Scenario Lab'}).click();
    await page.evaluate(()=>document.querySelectorAll('main details').forEach(d=>(d as HTMLDetailsElement).open=true));
    await audit(page,`${theme} ${width}px ${p}`);
    if(shotDir&&(width===1440||width===375)&&theme==='light'){mkdirSync(shotDir,{recursive:true});await page.screenshot({path:path.join(shotDir,`${width}${p.replace(/\//g,'_')||'_home'}.png`),fullPage:false});}
   }
   await ctx.close();
  }
  // Core tasks from the design brief, measured as interactions from the landing page.
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});const page=await ctx.newPage();
  await page.goto(base+'/');await ready(page);
  checks++;if(!await page.getByRole('heading',{name:'What is established today'}).isVisible())fail('Task A: established-state summary not visible on landing');
  // Task B: statistician reaches RQ1 exclusion criteria and the calculation code (≤3 interactions).
  await page.getByRole('link',{name:'Inspect the methods'}).click();await page.waitForURL('**/statistics');await page.getByRole('heading',{name:'Methods before data'}).waitFor();
  checks++;if(!await page.getByText('Exclusion',{exact:true}).first().isVisible())fail('Task B: exclusion criteria not visible after 1 interaction');
  checks++;if(!await page.getByRole('link',{name:/Calculation code/}).count())fail('Task B: calculation code link missing');
  // Task C: investigator finds a missing original-account link from a case (≤3 interactions).
  await page.goto(base+'/cases/E001');await ready(page);
  if(await page.getByText('Case unavailable in this view').count())console.log('SKIP Task C: case records are not public on this server (sign-in required)');
  else{await page.getByRole('button',{name:'List',exact:true}).click();checks++;if(!await page.locator('.chain-list li.missing').count())fail('Task C: no missing-link entry in the evidence chain list');}
  // Scenario Lab is gated: no percentage visible before opening it.
  await page.goto(base+'/protection');await ready(page);
  checks++;if(await page.locator('.proof-total').count())fail('Scenario output visible before the Scenario Lab was opened');
  // Keyboard: the status key opens with Enter and closes with Escape.
  await page.goto(base+'/');await ready(page);await page.locator('.status-key summary').focus();await page.keyboard.press('Enter');
  checks++;if(!await page.locator('.status-key-panel').isVisible())fail('Status key did not open from the keyboard');
  await page.keyboard.press('Escape');checks++;if(await page.locator('.status-key-panel').isVisible())fail('Status key did not close on Escape');
  await ctx.close();
 }finally{await browser.close();}
 console.log(`\n${checks} checks, ${failures.length} failures`);if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});

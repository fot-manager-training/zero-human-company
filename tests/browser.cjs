// Use a dedicated test session. This resets the target application's game.
const { chromium }=require('playwright');
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:8001';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForSelector('.flow-node');
 await page.evaluate(()=>window.api('/api/action',{action:'reset'}));
 await page.click('[data-speed="4"]');await page.click('#quick-demo');
 await page.waitForSelector('#approve',{timeout:20000});await page.click('#approve');
 await page.waitForFunction(()=>document.querySelectorAll('.flow-node.done').length===10,null,{timeout:20000});
 await page.locator('[data-agent="10"]').click();await page.waitForSelector('.result-table');
 if(!(await page.locator('#agent-detail').innerText()).includes('К выдаче'))throw Error('Missing final result');
 await page.click('.dialog-close');await page.click('.tab[data-view="journal"]');
 if(await page.locator('.journal-row').count()<20)throw Error('Missing events');
 await page.click('.tab[data-view="cowork"]');await page.selectOption('#gc-table-select','3');
 if(await page.locator('#gc-role').innerText()!=='Финансы')throw Error('Wrong workspace');
 await page.setViewportSize({width:390,height:844});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1))throw Error('Workspace overflow');
 await page.click('.tab[data-view="company"]');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Map horizontal overflow');
 await page.click('.tab[data-view="conversation"]');
 if(await page.locator('#conversation-list .transfer').count()!==12)throw Error('Missing handoffs');
 await page.selectOption('#conversation-filter','3');
 if(await page.locator('#conversation-list .transfer').count()!==2)throw Error('Wrong conversation filter');
 await page.click('.tab[data-view="architecture"]');await page.waitForFunction(()=>document.querySelector('.architecture-image').naturalWidth>0);
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: chain, human approval, results, journal, workspaces, dialogue, architecture, mobile');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require('playwright');const fs=require('node:fs');
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:8006/zero-human-company/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#cowork');await page.waitForSelector('#gc-workbench');
 if(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)!=='rgb(255, 255, 255)')throw Error('White canvas missing');
 await page.click('[data-wb-view="data"]');
 if(!(await page.locator('.wb-data-note').innerText()).includes('1200'))throw Error('Full registry missing');
 let dp=page.waitForEvent('download');await page.click('[data-wb-export="registry"]');let d=await dp;
 if(fs.readFileSync(await d.path(),'utf8').split('\r\n').length!==1201)throw Error('Full CSV export missing rows');
 await page.fill('#wb-search','P-0001');if(await page.locator('.wb-table tbody tr').count()!==2)throw Error('Registry search did not show original and duplicate');
 await page.evaluate(async()=>{await api('/api/config',{speed:16,auto_approve:true});await api('/api/action',{action:'start'})});
 await page.waitForFunction(()=>document.querySelectorAll('.flow-node.done').length===10,null,{timeout:40000});
 await page.evaluate(()=>selectTable(3,true));await page.click('[data-wb-view="chat"]');
 const composer=await page.locator('.gc-composer-wrap').boundingBox();
 await page.fill('#gc-message','Сформируй подробный финансовый отчёт с вариантами резерва и поставщиками.');await page.click('#gc-send');
 await page.waitForFunction(()=>document.querySelector('.gc-review-reply')?.textContent.includes('Финансовый отчёт объединяет'),null,{timeout:15000});
 await page.waitForFunction(()=>!document.querySelector('#gc-send').disabled);
 await page.locator('#gc-history [data-wb-open="finance-report"]').click();
 if(!(await page.locator('.wb-report-summary').innerText()).includes('1 200')&&!(await page.locator('.wb-report-summary').innerText()).includes('1200'))throw Error('Analytical report missing source counts');
 await page.click('[data-wb-generate="finance-report"]');if(!(await page.locator('.wb-panel-heading').innerText()).includes('Версия 2'))throw Error('Revision missing');
 dp=page.waitForEvent('download');await page.click('[data-wb-export="finance-report"]');d=await dp;const html=fs.readFileSync(await d.path(),'utf8');if(!html.includes('Сценарии резерва')||!html.includes('65200')&& !html.includes('65 200'))throw Error('Finance download missing comparison');
 await page.screenshot({path:'/tmp/zh-rich-report.png'});
 await page.click('[data-wb-view="chat"]');const after=await page.locator('.gc-composer-wrap').boundingBox();if(Math.abs(after.y-composer.y)>1)throw Error('Composer moved');
 await page.reload();await page.waitForSelector('.gc-review-reply');if(!(await page.locator('.gc-review-reply').innerText()).includes('Финансовый отчёт'))throw Error('Conversation persistence missing');
 for(const size of [{width:390,height:844},{width:1024,height:768}]){await page.setViewportSize(size);for(const view of ['data','reports','chat']){await page.click(`[data-wb-view="${view}"]`);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1||scrollY!==0))throw Error('Workspace overflow '+JSON.stringify(size)+' '+view);}}
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: registry search/full CSV, completed-role followup, versioned finance report/HTML download, persistent chats, fixed desktop/mobile viewport');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

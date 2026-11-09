const {chromium}=require('playwright');
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:8006/zero-human-company/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#architecture');await page.waitForSelector('.guide-section');
 await page.waitForFunction(()=>document.querySelector('.hero-object img').naturalWidth>0);
 if(await page.locator('.guide-section').count()!==4)throw Error('Four guide sections required');
 await page.waitForFunction(()=>[...document.querySelectorAll('.guide-image')].every(img=>img.complete&&img.naturalWidth>0));
 await page.locator('.guide-details summary').first().click();if(await page.locator('.guide-role-table tbody tr').count()!==10)throw Error('Ten role contracts required');
 await page.screenshot({path:'/tmp/zh-guide-blue.png',fullPage:true});
 await page.click('.tab[data-view="company"]');await page.screenshot({path:'/tmp/zh-blue-company.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.click('.tab[data-view="architecture"]');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Guide mobile overflow');
 await page.screenshot({path:'/tmp/zh-guide-mobile.png',fullPage:true});
 await page.click('.tab[data-view="cowork"]');
 if(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth))throw Error('Locked workspace regressed');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: four diagrams, ten contracts, responsive design, fixed workspace');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

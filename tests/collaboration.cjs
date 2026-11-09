const {chromium}=require('playwright');
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:8002/zero-human-company/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForSelector('.flow-node');
  await page.evaluate(async()=>{await (window.gameTransport||fetch)('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reset'})})});
  await page.reload();await page.waitForSelector('.flow-node');
  for(const selector of ['.metrics','.hero-card','.eyebrow','#progress-value'])if(await page.locator(selector).count())throw Error('Removed element remains: '+selector);
  if((await page.locator('body').innerText()).includes('Браузерное демо'))throw Error('Removed phrase remains');
  if(await page.locator('#auto-approve').isChecked())throw Error('Human decision must be the default');
  await page.click('.tab[data-view="cowork"]');
  if(await page.locator('#gc-table-select option').count()!==10)throw Error('Expected 10 workspaces');
  await page.selectOption('#gc-table-select','3');
  if(await page.locator('#gc-role').innerText()!=='Финансы')throw Error('Wrong table workspace');
  if(!await page.locator('#gc-send').isDisabled())throw Error('Premature finance submission allowed');
  await page.click('[data-gc-action="agents"]');await page.locator('.gc-agent-list [data-cowork-table="1"]').click();
  await page.click('[data-gc-action="attach"]');await page.click('[data-gc-file="0"]');
  if(!(await page.locator('#gc-attachments').innerText()).includes('Демо-бриф'))throw Error('Context attachment missing');
  await page.fill('#gc-message','Помоги подготовить новогодние подарки партнёрам к 10 декабря. Рассчитай тираж по списку.');
  await page.screenshot({path:'/tmp/zh-collaboration-cowork.png',fullPage:true});
  await page.click('#gc-send');await page.click('.gc-watch');
  await page.waitForSelector('.running-agent',{timeout:15000});
  const first=await page.locator('.running-agent').first().getAttribute('transform');
  await page.waitForTimeout(220);
  const second=await page.locator('.running-agent').first().getAttribute('transform');
  if(first===second)throw Error('Agents did not move');
  if(await page.locator('.moving-message').count()===0||await page.locator('.map-explanation').count()===0)throw Error('On-map speech/actions missing');
  await page.screenshot({path:'/tmp/zh-collaboration-running.png',fullPage:true});
  await page.waitForSelector('#approve',{timeout:20000});
  const state=await page.evaluate(async()=>(await (window.gameTransport||fetch)('/api/state')).json());
  if(state.approval||state.agents[6].status!=='waiting')throw Error('Human decision was bypassed');
  await page.click('.tab[data-view="cowork"]');await page.selectOption('#gc-table-select','6');
  await page.waitForSelector('[data-gc-action="approve"]');await page.click('[data-gc-action="approve"]');
  await page.click('.tab[data-view="company"]');await page.click('[data-speed="16"]');
  await page.waitForFunction(()=>document.querySelector('#game-status').textContent==='Готово к вручению',null,{timeout:15000});
  await page.click('.tab[data-view="cowork"]');await page.selectOption('#gc-table-select','10');
  if(!(await page.locator('#gc-history').innerText()).includes('РЕЗУЛЬТАТ ДЛЯ ПРОВЕРКИ ЧЕЛОВЕКОМ'))throw Error('Human review output missing');
  for(const view of ['cowork','company']){
   await page.click(`.tab[data-view="${view}"]`);await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:`/tmp/zh-collaboration-mobile-${view}.png`,fullPage:true});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow in '+view);
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS: removed blocks, 10 GigaCoWork screens, chat dispatch, running agents, on-map explanations, human approval, mobile');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

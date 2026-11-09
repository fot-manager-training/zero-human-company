const {chromium}=require('playwright');
const base=process.env.GAME_TEST_URL||'http://127.0.0.1:8015/zero-human-company/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForSelector('.flow-node');
 const result=await page.evaluate(async()=>{
  const seed=await api('/api/state'),problems=[];
  const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  for(const phase of ['waiting','working','done']){
   const s=structuredClone(seed);for(const a of s.agents)a.status=phase;GameVisuals.render(s);
   const nodes=new Map([...document.querySelectorAll('.flow-node')].map(n=>[Number(n.dataset.agent),n]));nodes.set(0,document.querySelector('.map-finish'));
   const cards=[...nodes].map(([id,n])=>[id,n.querySelector('.node-card').getBoundingClientRect()]);
   for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)if(overlaps(cards[i][1],cards[j][1]))problems.push(`${phase}: cards ${cards[i][0]} / ${cards[j][0]}`);
   for(const label of document.querySelectorAll('.map-edge-label,.map-stage-heading'))for(const [id,card]of cards)if(overlaps(label.getBoundingClientRect(),card))problems.push(`${phase}: label ${label.textContent} / card ${id}`);
   for(const edge of document.querySelectorAll('.flow-edge')){
    const svg=edge.ownerSVGElement,ctm=svg.getScreenCTM(),len=edge.getTotalLength(),from=Number(edge.dataset.from),to=Number(edge.dataset.to);
    for(const [position,id]of [[0,from],[len,to]]){const p=edge.getPointAtLength(position),screen=new DOMPoint(p.x,p.y).matrixTransform(ctm),r=nodes.get(id).querySelector('.node-card').getBoundingClientRect();const distance=Math.min(Math.abs(screen.x-r.left),Math.abs(screen.x-r.right),Math.abs(screen.y-r.top),Math.abs(screen.y-r.bottom));if(distance>1||screen.x<r.left-1||screen.x>r.right+1||screen.y<r.top-1||screen.y>r.bottom+1)problems.push(`${phase}: unconnected edge ${from}-${to}`)}
    for(let distance=5;distance<len-5;distance+=5){const p=edge.getPointAtLength(distance),screen=new DOMPoint(p.x,p.y).matrixTransform(ctm);for(const[id,r]of cards)if(id!==from&&id!==to&&screen.x>r.left+1&&screen.x<r.right-1&&screen.y>r.top+1&&screen.y<r.bottom-1)problems.push(`${phase}: edge ${from}-${to} crosses card ${id}`)}
   }
   for(const n of document.querySelectorAll('.flow-node')){const card=n.querySelector('.node-card').getBoundingClientRect();for(const item of n.querySelectorAll('.node-name,.node-status,.node-summary,.map-explanation')){const r=item.getBoundingClientRect();if(r.left<card.left-.5||r.right>card.right+.5||r.top<card.top-.5||r.bottom>card.bottom+.5)problems.push(`${phase}: text escapes card ${n.dataset.agent}`)}}
  }
  return [...new Set(problems)];
 });
 if(result.length)throw Error(result.join('\n'));
 await page.locator('.flow-scroll').screenshot({path:'/tmp/zh-map-layout-complete.png'});
 await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 await page.setViewportSize({width:1600,height:1000});await page.click('#present-mode');if(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1))throw Error('Presenter overflow');
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: every connector reaches both cards; no card/label/text overlap or routes crossing unrelated cards in compact, expanded, and completed states; mobile and presenter layout');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

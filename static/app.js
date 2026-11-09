const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
const states = {waiting:'Ожидает',ready:'Ваш ход',working:'Работает',approval:'Согласование',done:'Готово'};
const colors = ['#607aa8','#6e9e88','#ae9765','#a58bb4','#6c9d9c','#7b8da4','#c29a6a','#6c9eaf','#859f79','#b98c94'];
const icons = ['case','list','calc','pencil','glass','case','box','box','list','gift'];
let state, selected = 1, currentView='company', lastRevision=-1, pollBusy=false, modalAgent=null, toastTimer, quickPending=false, tableDemoPending=false;
function avatar(a){
 const n=a.id, c=colors[n-1], hair=['#574d46','#554840','#414850','#6b493b','#64584a'][n%5];
 let accessory='';
 if(icons[n-1]==='case') accessory='<rect x="70" y="58" width="23" height="18" rx="3" fill="#927558"/><path d="M77 58v-5h10v5" fill="none" stroke="#927558" stroke-width="3"/>';
 if(icons[n-1]==='list') accessory='<rect x="71" y="51" width="20" height="27" rx="3" fill="#e9ede8" stroke="#a0b2a5"/><path d="M75 59h12m-12 5h12m-12 5h8" stroke="#91a398" stroke-width="2"/>';
 if(icons[n-1]==='calc') accessory='<rect x="70" y="51" width="22" height="29" rx="4" fill="#53615d"/><rect x="74" y="55" width="14" height="7" rx="1" fill="#b5d4bd"/><path d="M75 67h3m4 0h3m-10 6h3m4 0h3" stroke="#dfe6dc" stroke-width="3"/>';
 if(icons[n-1]==='pencil') accessory='<path d="M77 74l12-35 5 2-12 35-6 7z" fill="#d0ad58"/><path d="M77 74l5 2-6 7z" fill="#e9c3a4"/>';
 if(icons[n-1]==='glass') accessory='<circle cx="82" cy="56" r="11" fill="#c6e6e6" fill-opacity=".6" stroke="#607d84" stroke-width="3"/><path d="M89 65l9 12" stroke="#607d84" stroke-width="5" stroke-linecap="round"/>';
 if(icons[n-1]==='box'||icons[n-1]==='gift') accessory=`<rect x="67" y="53" width="27" height="24" rx="3" fill="${n===10?'#9bbfa2':'#c9ad7d'}"/><path d="M80 53v24m-13-17h27" stroke="${n===10?'#e9dfb4':'#e8d5b2'}" stroke-width="3"/>`;
 return `<svg viewBox="0 0 115 108" aria-hidden="true"><ellipse cx="55" cy="94" rx="35" ry="7" fill="#e9eeea"/><circle class="halo" cx="55" cy="52" r="43" fill="none" stroke="#e7ece7" stroke-dasharray="2 5"/><g class="avatar-person"><path d="M43 73l-3 18m27-18 3 18" stroke="#596b64" stroke-width="9" stroke-linecap="round"/><path d="M33 68q0-24 22-24t22 24v10H33z" fill="${c}"/><path d="M36 57l-8 15m46-15 7 15" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M51 45l4 9 5-9" fill="#f3e9dc"/><rect x="50" y="36" width="11" height="12" rx="4" fill="#e7bda0"/><circle cx="55" cy="29" r="17" fill="#f1cfaf"/><path d="M38 29q-3-22 16-22 20 0 18 23l-5-15q-9 7-23 5l-4 10z" fill="${hair}"/><circle cx="49" cy="29" r="1.6" fill="#47534c"/><circle cx="61" cy="29" r="1.6" fill="#47534c"/><path d="M51 36q4 4 8 0" stroke="#986c59" stroke-width="1.5" fill="none"/>${accessory}</g>${a.status==='done'?'<circle cx="91" cy="22" r="10" fill="#e3f3e8" stroke="#b6d9c1"/><path d="M86 22l3 3 6-7" fill="none" stroke="#429269" stroke-width="2"/>':''}${a.status==='working'?'<circle cx="91" cy="22" r="7" fill="#e6c479"/>':''}</svg>`;
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),5000)}
async function api(path, payload){const r=await (window.gameTransport || fetch)(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||'Ошибка сервера');await refresh();return data;}
async function refresh(){if(pollBusy)return;pollBusy=true;try{const r=await (window.gameTransport || fetch)('/api/state');if(!r.ok)throw Error();const next=await r.json();$('#connection').textContent='';if(next.revision!==lastRevision||next.id!==state?.id){state=next;lastRevision=next.revision;render();}}catch{$('#connection').textContent='Нет связи · повторяем…';}finally{pollBusy=false}}
function time(t){return new Date(t*1000).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function render(){
 const o=state.order;
 const approval=state.agents[5].status==='approval';
 $('#approval').classList.toggle('hidden',!approval);
 if(approval) $('#approval').innerHTML=`<div><strong>⑥ Закупка ждёт согласования</strong><p>Тираж ${o.quantity} шт. · смета ${money(o.total)} ₽ · лимит ${money(state.config.budget)} ₽</p><p>${o.total>state.config.budget?'Лимит превышен. Создайте новую игру и скорректируйте бюджет.':'Макет проверен. Решение о размещении заказа принимает человек.'}</p></div><button id="approve" class="button" ${o.total>state.config.budget?'disabled':''}>✓ Согласовать</button>`;
 $('#journal').innerHTML=state.events.slice().reverse().map(e=>`<article class="journal-row"><time>${time(e.time)}<br>МСК · #${e.id}</time><div><strong>${e.table?'СТОЛ '+e.table+' · '+esc(state.agents[e.table-1].name):'КОМПАНИЯ'} / ${esc(e.kind)}</strong>${esc(e.text)}${e.data?`<pre>${esc(JSON.stringify(e.data,null,2))}</pre>`:''}</div></article>`).join('')||'<div class="empty">Пока нет событий. Пора дать компании первое поручение.</div>';
 window.GameVisuals.render(state);window.CoWork.render(state,selected);if(modalAgent!==null)renderDetail(modalAgent);
}
function selectTable(n,openScreen=false,scripted=false){if(window.CoWork.isPlaying()&&!scripted){toast('Остановите автопоказ, чтобы выбрать другой стол вручную.');return}selected=n;if(openScreen||currentView==='cowork'){const url=new URL(location.href);url.searchParams.set('table',n);history.replaceState(null,'',url)}window.CoWork.render(state,selected);if(openScreen)showView('cowork');}
function showView(view){currentView=view;document.body.classList.toggle('cowork-active',view==='cowork');if(view==='cowork')window.scrollTo(0,0);for(const key of ['company','cowork','conversation','architecture','journal'])$('#'+key+'-view').classList.toggle('hidden',view!==key);document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));history.replaceState(null,'','#'+view);}
function renderDetail(n){const a=state.agents[n-1];$('#agent-detail').innerHTML=`<div class="detail-avatar">${avatar(a)}</div><div class="dialog-eyebrow">СТОЛ ${String(n).padStart(2,'0')} / ${states[a.status]}</div><h2>${esc(a.name)}</h2><p>${esc(a.task)}</p><div class="detail-task">${esc(a.instruction)}<br><small>Демонстрационный движок исполняет фиксированные правила этой роли.</small></div>${a.output?'<h3>Результат работы</h3><table class="result-table">'+Object.entries(a.output).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(typeof v==='object'?Object.entries(v).map(([k,v])=>`Стол ${k}: ${v}`).join(' · '):v)}</td></tr>`).join('')+'</table>':'<p>Результат появится после выполнения задачи агентом.</p>'}<div class="dialog-actions"><button class="button primary-button" data-open-workspace="${n}">Открыть GigaCoWork стола →</button></div>`}
async function safe(fn){try{await fn()}catch(e){toast(e.message)}}
document.addEventListener('click',e=>{
 const view=e.target.closest('[data-view]');if(view)showView(view.dataset.view);
 const agent=e.target.closest('[data-agent]');if(agent){modalAgent=Number(agent.dataset.agent);renderDetail(modalAgent);$('#agent-dialog').showModal()}
 const open=e.target.closest('[data-open-workspace]');if(open){$('#agent-dialog').close();selectTable(Number(open.dataset.openWorkspace),true)}
 const speed=e.target.closest('[data-speed]');if(speed)safe(()=>api('/api/config',{speed:Number(speed.dataset.speed)}));
 if(e.target.closest('#approve,[data-scene-approve]'))safe(()=>api('/api/action',{action:'approve'}));
});
$('#agent-dialog .dialog-close').onclick=()=>$('#agent-dialog').close();$('#agent-dialog').addEventListener('close',()=>modalAgent=null);
async function submitTableMessage(table,text,ui='gigacowork-demo'){
 if(!state.started)await api('/api/action',{action:'set-mode',auto:state.auto});
 await api('/api/messages',{table_id:table,text,ui,request_id:crypto.randomUUID()});
}
$('#cancel-reset').onclick=()=>{quickPending=false;tableDemoPending=false;$('#reset-dialog').close()};$('#confirm-reset').onclick=()=>safe(async()=>{window.CoWork.cancelDemo();selected=1;await api('/api/action',{action:'reset'});$('#reset-dialog').close();if(tableDemoPending){tableDemoPending=false;await window.CoWork.startDemo()}else if(quickPending){quickPending=false;await quickStart()}else toast('Новая компания готова к работе')});
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`company-${state.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function requestTableDemo(){document.body.classList.remove('presenting');$('#present-mode').textContent='⛶ На большой экран';if(state.started){tableDemoPending=true;quickPending=false;$('#reset-dialog').showModal()}else await window.CoWork.startDemo()}
async function quickStart(){
 await api('/api/action',{action:'start',auto:true});showView('company');
}
$('#reset-dialog').addEventListener('cancel',()=>{tableDemoPending=false;quickPending=false});
$('#quick-demo').onclick=()=>safe(async()=>{tableDemoPending=false;if(state.started){quickPending=true;$('#reset-dialog').showModal()}else await quickStart()});
$('#present-mode').onclick=()=>{const enabled=document.body.classList.toggle('presenting');$('#present-mode').textContent=enabled?'↙ Обычный вид':'⛶ На большой экран'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('presenting');$('#present-mode').textContent='⛶ На большой экран'}});
$('#flow-pause').onclick=()=>safe(()=>api('/api/action',{action:state.running?'pause':'resume'}));
$('#conversation-filter').onchange=()=>window.GameVisuals.render(state);
document.addEventListener('keydown',e=>{const agent=e.target.closest('[data-agent]');if(agent&&(e.key==='Enter'||e.key===' ')){e.preventDefault();agent.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(['company','cowork','conversation','architecture','journal'].includes(view))showView(view)});
async function init(){const requestedTable=Number(new URL(location.href).searchParams.get('table'));if(Number.isInteger(requestedTable)&&requestedTable>=1&&requestedTable<=10)selected=requestedTable;await refresh();const initialView=location.hash.slice(1)||(requestedTable>=1&&requestedTable<=10?'cowork':'');if(['company','cowork','conversation','architecture','journal'].includes(initialView))showView(initialView);setInterval(refresh,250)}init();

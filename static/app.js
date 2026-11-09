const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
const states = {waiting:'Ожидает',ready:'Ваш ход',working:'Работает',approval:'Согласование',done:'Готово'};
const colors = ['#607aa8','#6e9e88','#ae9765','#a58bb4','#6c9d9c','#7b8da4','#c29a6a','#6c9eaf','#859f79','#b98c94'];
const icons = ['case','list','calc','pencil','glass','case','box','box','list','gift'];
let state, selected = 1, currentView='company', lastRevision=-1, pollBusy=false, modalAgent=null, toastTimer;
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
async function refresh(){if(pollBusy)return;pollBusy=true;try{const r=await (window.gameTransport || fetch)('/api/state');if(!r.ok)throw Error();const next=await r.json();$('#connection').textContent=window.gameTransport?'Браузерное демо':'Сервер на связи';if(next.revision!==lastRevision||next.id!==state?.id){state=next;lastRevision=next.revision;render();}}catch{$('#connection').textContent='Нет связи · повторяем…';}finally{pollBusy=false}}
function agentCard(a){return `<button class="agent ${a.status}" data-agent="${a.id}" aria-label="Стол ${a.id}: ${esc(a.name)}, ${states[a.status]}">${avatar(a)}<strong>${esc(a.name)}</strong><span class="table-num">СТОЛ ${String(a.id).padStart(2,'0')}</span><span class="agent-state">${a.status==='done'?'✓ ':''}${states[a.status]}</span></button>`}
function time(t){return new Date(t*1000).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function eventFeed(e){return `<div class="feed-item"><time>${time(e.time)}</time><i class="event-marker ${e.kind}"></i><div>${e.table?`<p>Стол ${String(e.table).padStart(2,'0')} · ${esc(state.agents[e.table-1].name)}</p>`:''}${esc(e.text)}</div></div>`}
function render(){
 const done=state.agents.filter(a=>a.status==='done').length, o=state.order;
 $('#progress-value').innerHTML=`${done} <small>/ 10 агентов</small>`;$('#progress-bar').style.width=done*10+'%';
 $('#quantity').innerHTML=`${o.quantity??'—'} <small>шт.</small>`;
 $('#reserve-label').textContent=o.quantity?`${o.base} получателей + ${o.reserve} в резерв`:'После расчёта партнёров';
 $('#cost').innerHTML=`${o.total?money(o.total):'—'} <small>₽</small>`;$('#budget-label').textContent=`Лимит ${money(state.config.budget)} ₽${o.total>state.config.budget?' · превышен':''}`;
 const approval=state.agents[5].status==='approval';
 $('#game-status').textContent=state.complete?'Готово к вручению':approval?'Нужно ваше решение':state.running?'Компания работает':state.started?'Прогон на паузе':'Готова к запуску';
 $('#status-sub').textContent=state.complete?'100 подарков ждут участников':approval?'Закупка ожидает ведущего':state.running?`${state.agents.filter(a=>a.status==='working').length} агентов в работе`:state.started?'Состояние сохранено':'Все агенты на своих местах';
 $('#agents-top').innerHTML=state.agents.slice(0,5).map(agentCard).join('');$('#agents-bottom').innerHTML=state.agents.slice(5).map(agentCard).join('');
 $('#feed').innerHTML=state.events.slice(-4).reverse().map(eventFeed).join('')||'<div class="empty">Здесь начнётся история вашей компании.<br>Запустите демо или отправьте первое поручение.</div>';
 $('#order-number').textContent=o.number||'ЧЕРНОВИК';
 $('#order-details').innerHTML=[['Подарок',o.gift||'Новогодний шар с логотипом'],['Срок',o.deadline||'10 декабря 2026'],['Макет',o.version?`${o.design} · ${o.color} · ${o.version}`:'Ожидает дизайнера'],['Получатели',o.base?`${o.base} партнёров`:'Из демо-списка']].map(([k,v])=>`<div class="order-row"><span>${k}</span><b>${esc(v)}</b></div>`).join('')+`<div class="order-note">${state.complete?'✓ По 10 подарков каждому столу. Резерв: '+o.reserve+' шт.':'Один заказ объединяет все десять команд.'}</div>`;
 $('#approval').classList.toggle('hidden',!approval);
 if(approval) $('#approval').innerHTML=`<div><strong>⑥ Закупка ждёт согласования</strong><p>Тираж ${o.quantity} шт. · смета ${money(o.total)} ₽ · лимит ${money(state.config.budget)} ₽</p><p>${o.total>state.config.budget?'Лимит превышен. Создайте новую игру и скорректируйте бюджет.':'Макет проверен. Решение о размещении заказа принимает человек.'}</p></div><button id="approve" class="button" ${o.total>state.config.budget?'disabled':''}>✓ Согласовать</button>`;
 $('#tables-grid').innerHTML=state.agents.map(a=>`<button class="table-card" data-table="${a.id}"><span class="dialog-eyebrow">СТОЛ ${String(a.id).padStart(2,'0')}</span><h3>${esc(a.name)}</h3><p>${esc(a.task)}</p><small>${states[a.status]} → открыть терминал</small></button>`).join('');
 $('#journal').innerHTML=state.events.slice().reverse().map(e=>`<article class="journal-row"><time>${time(e.time)}<br>МСК · #${e.id}</time><div><strong>${e.table?'СТОЛ '+e.table+' · '+esc(state.agents[e.table-1].name):'КОМПАНИЯ'} / ${esc(e.kind)}</strong>${esc(e.text)}${e.data?`<pre>${esc(JSON.stringify(e.data,null,2))}</pre>`:''}</div></article>`).join('')||'<div class="empty">Пока нет событий. Пора дать компании первое поручение.</div>';
 for(const id of ['reserve','budget','design','speed']){const el=$('#'+id);el.disabled=state.started;if(document.activeElement!==el)el.value=state.config[id];}
 $('#manual').disabled=state.started;
 if(state.started)$('#manual').checked=!state.auto;
 $('#play').disabled=state.complete;$('#play').textContent=state.complete?'✓ Миссия выполнена':!state.started?'▶ Запустить демонстрацию':state.running?'Ⅱ Приостановить':'▶ Продолжить';
 renderTerminal();if(modalAgent!==null)renderDetail(modalAgent);
}
function renderTerminal(){if(!$('#table-select').options.length)$('#table-select').innerHTML=state.agents.map(a=>`<option value="${a.id}">${String(a.id).padStart(2,'0')} · ${esc(a.name)}</option>`).join('');const a=state.agents[selected-1];$('#table-select').value=selected;$('#table-context').textContent=a.task+' · '+states[a.status];
 let html=state.messages.filter(m=>m.table===selected).map(m=>`<div class="chat-message"><small>СТОЛ ${selected} · ${m.source==='gigacowork'?'GIGACOWORK':'ТЕРМИНАЛ'}</small>${esc(m.text)}</div>`).join('');
 if(a.output)html+=`<div class="chat-message agent-message"><small>АГЕНТ · РЕЗУЛЬТАТ</small>${Object.entries(a.output).map(([k,v])=>esc(k)+': '+esc(typeof v==='object'?Object.entries(v).map(([k,v])=>`${k}: ${v}`).join(', '):v)).join('<br>')}</div>`;
 $('#chat').innerHTML=html||'<div class="chat-empty">Ваш агент на связи.<br>Отправьте поручение или запустите демо.</div>';
 $('#chat').scrollTop=$('#chat').scrollHeight;
 const available=(!state.started&&selected===1)||(state.started&&!state.complete&&a.status==='ready');
 $('#send').disabled=!available;$('#message').disabled=!available;
 $('#message').placeholder=available?'Напишите поручение агенту…':a.status==='done'?'Результат передан следующему агенту':a.status==='working'?'Агент выполняет поручение…':'Ожидаем входящие данные';
}
function selectTable(n){selected=n;renderTerminal();$('#message').focus();}
function showView(view){currentView=view;for(const key of ['company','tables','journal'])$('#'+key+'-view').classList.toggle('hidden',view!==key);document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));}
function renderDetail(n){const a=state.agents[n-1];$('#agent-detail').innerHTML=`<div class="detail-avatar">${avatar(a)}</div><div class="dialog-eyebrow">СТОЛ ${String(n).padStart(2,'0')} / ${states[a.status]}</div><h2>${esc(a.name)}</h2><p>${esc(a.task)}</p><div class="detail-task">${esc(a.instruction)}<br><small>Демонстрационный движок исполняет фиксированные правила этой роли.</small></div>${a.output?'<h3>Результат работы</h3><table class="result-table">'+Object.entries(a.output).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(typeof v==='object'?Object.entries(v).map(([k,v])=>`Стол ${k}: ${v}`).join(' · '):v)}</td></tr>`).join('')+'</table>':'<p>Результат появится после выполнения задачи агентом.</p>'}<div class="dialog-actions"><button class="button primary-button" data-open-terminal="${n}">Открыть терминал стола →</button></div>`}
async function safe(fn){try{await fn()}catch(e){toast(e.message)}}
document.addEventListener('click',e=>{
 const view=e.target.closest('[data-view]');if(view)showView(view.dataset.view);
 const agent=e.target.closest('[data-agent]');if(agent){modalAgent=Number(agent.dataset.agent);renderDetail(modalAgent);$('#agent-dialog').showModal()}
 const table=e.target.closest('[data-table]');if(table)selectTable(Number(table.dataset.table));
 const open=e.target.closest('[data-open-terminal]');if(open){$('#agent-dialog').close();selectTable(Number(open.dataset.openTerminal))}
 if(e.target.closest('#approve'))safe(()=>api('/api/action',{action:'approve'}));
});
$('#agent-dialog .dialog-close').onclick=()=>$('#agent-dialog').close();$('#agent-dialog').addEventListener('close',()=>modalAgent=null);
$('#table-select').onchange=e=>selectTable(Number(e.target.value));
$('#message-form').onsubmit=e=>{e.preventDefault();safe(async()=>{if(!state.started){await saveConfig();await api('/api/action',{action:'set-mode',auto:!$('#manual').checked})}await api('/api/messages',{table_id:selected,text:$('#message').value,request_id:crypto.randomUUID()});$('#message').value=''})};
$('#message').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#message-form').requestSubmit()}};
async function saveConfig(){await api('/api/config',{reserve:Number($('#reserve').value),budget:Number($('#budget').value),design:$('#design').value,speed:Number($('#speed').value)})}
$('#play').onclick=()=>safe(async()=>{if(!state.started){const auto=!$('#manual').checked;await saveConfig();await api('/api/action',{action:'start',auto})}else await api('/api/action',{action:state.running?'pause':'resume'})});
$('#reset').onclick=()=>$('#reset-dialog').showModal();$('#cancel-reset').onclick=()=>$('#reset-dialog').close();$('#confirm-reset').onclick=()=>safe(async()=>{selected=1;await api('/api/action',{action:'reset'});$('#reset-dialog').close();$('#message').value='';toast('Новая компания готова к работе')});
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`company-${state.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function init(){await refresh();if(state){$('#table-select').innerHTML=state.agents.map(a=>`<option value="${a.id}">${String(a.id).padStart(2,'0')} · ${esc(a.name)}</option>`).join('');renderTerminal();}setInterval(refresh,650)}init();

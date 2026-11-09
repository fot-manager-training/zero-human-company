/* Interactive training workspace inspired by the supplied GigaCoWork screenshot. */
window.CoWork = (() => {
  const h = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = s => document.querySelector(s);
  let latest=null, selected=1, busy=false, lastSignature='', lastGame=null;
  const drafts={}, attached={};
  const suggestions = ['Подготовить документ','Посчитать или свести данные','Быстро разобраться в задаче'];
  const files = ['Демо-бриф мероприятия','Список партнёров: 108 записей','Прайс: шар, упаковка, доставка','Демо-брендбук и макеты','Чек-лист приёмки'];
  const ready = a => (!latest.started&&a.id===1)||(latest.started&&!latest.complete&&a.status==='ready');
  function shell(){
    $('#cowork-screen').innerHTML=`<div class="gc-app"><aside class="gc-rail"><span class="gc-rail-symbol">◫</span><button data-gc-action="search" aria-label="Найти стол">⌕</button><button class="selected" data-gc-action="spaces" aria-label="Все пространства">▱</button><button data-view="company" aria-label="Посмотреть работу команды">↗</button><div class="gc-rail-bottom"><button data-gc-action="help" aria-label="Как играть">?</button><span>УЧ</span></div></aside><aside class="gc-sidebar"><div class="gc-logo" aria-label="GigaCoWork">GIGA<br>COWORK</div><button data-gc-action="personal">Личное пространство</button><button data-gc-action="spaces">Все пространства</button><div class="gc-section-heading">Избранные <span>⌄</span></div><div id="gc-spaces"></div><button class="gc-muted" data-gc-action="spaces">Показать все столы</button><div class="gc-section-heading">Недавние <span>⌄</span></div><button id="gc-recent" data-gc-action="personal"></button><div class="gc-sidebar-note">Человек формулирует задачу.<br>ИИ готовит результат.<br>Человек проверяет и решает.</div></aside><main class="gc-main"><div class="gc-topbar"><button class="gc-back" data-gc-action="spaces">☰ Столы</button><div class="gc-participants"><span>К</span><span>М</span><span>Д</span><span>П</span></div><label class="gc-select-wrap"><span class="sr-only">Рабочее место стола</span><select id="gc-table-select"></select></label><button class="gc-more" data-gc-action="context" aria-label="Контекст стола">⋮</button></div><div class="gc-work-area"><div class="gc-title"><h2 id="gc-role"></h2><p id="gc-task"></p></div><div id="gc-status" class="gc-status"></div><div id="gc-decision"></div><div id="gc-history" class="gc-history" aria-live="polite"></div><div class="gc-composer-wrap"><form id="gc-form" class="gc-composer"><label class="sr-only" for="gc-message">Поручение ИИ-помощнику</label><textarea id="gc-message" maxlength="4000" placeholder="Чем я могу помочь?" required></textarea><div id="gc-attachments" class="gc-attachments"></div><div class="gc-compose-tools"><div class="gc-tool-left"><button type="button" data-gc-action="attach" aria-label="Добавить демо-материал">＋</button><button type="button" data-gc-action="context" aria-label="Задание и контекст">▧</button><button type="button" class="gc-agent-picker" data-gc-action="agents">＠ Агент <span>⌄</span></button></div><button id="gc-send" type="submit" aria-label="Отправить поручение из GigaCoWork">↑</button></div></form><div class="gc-integrations"><div><span>Б</span><span>С</span><span>₽</span></div><button data-gc-action="context">Материалы стола <span>⌄</span></button></div></div><div class="gc-suggestions">${suggestions.map((s,i)=>`<button data-gc-suggest="${i}"><span>${['▤','◷','?'][i]}</span>${s}</button>`).join('')}</div><div id="gc-popover" class="gc-popover hidden"></div><p class="gc-training-note">Учебная эмуляция интерфейса. Сообщение запускает сценарий ИИ-помощника; реальное подключение GigaCoWork не используется.</p><button class="gc-watch" data-view="company">Наблюдать за помощью ИИ на схеме →</button></div><button class="gc-help" data-gc-action="help" aria-label="Помощь">?</button></main></div>`;
    $('#gc-message').oninput=e=>drafts[selected]=e.target.value;
    $('#gc-form').onsubmit=e=>{e.preventDefault();send()};
    $('#gc-message').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#gc-form').requestSubmit()}};
    $('#gc-table-select').onchange=e=>window.selectTable(Number(e.target.value));
  }
  function formatOutput(output){return Object.entries(output).map(([k,v])=>`<div class="gc-result-row"><span>${h(k)}</span><b>${h(typeof v==='object'?Object.entries(v).map(([a,b])=>`Стол ${a}: ${b}`).join(' · '):v)}</b></div>`).join('')}
  function render(s,table){
    if(lastGame!==s.id){lastGame=s.id;for(const key of Object.keys(drafts))delete drafts[key];for(const key of Object.keys(attached))delete attached[key];lastSignature=''}
    latest=s;selected=table;
    if(!$('#gc-main')&&!$('#gc-form'))shell();
    const a=s.agents[table-1];
    $('#gc-table-select').innerHTML=s.agents.map(a=>`<option value="${a.id}" ${a.id===table?'selected':''}>Стол ${String(a.id).padStart(2,'0')}</option>`).join('');
    $('#gc-spaces').innerHTML=s.agents.map(a=>`<button data-cowork-table="${a.id}" class="${a.id===table?'active':''}">${h(a.name)}</button>`).join('');
    $('#gc-recent').textContent=a.name;
    $('#gc-role').textContent=a.name;$('#gc-task').textContent=a.task;
    const status={waiting:'Сначала дождитесь входных данных от коллег.',ready:'Ваш ход: задайте поручение ИИ-помощнику.',working:'ИИ помогает с задачей. Его действия видны на схеме.',approval:'ИИ подготовил заказ. Капитан команды должен согласовать закупку.',done:'Помощник подготовил результат и передал его коллегам.'};
    $('#gc-status').textContent=!s.started?(table===1?'Начните с поручения: что подготовить, для кого и к какому сроку.':'Сначала стол 01 запускает общее поручение.'):s.complete?'Команда выполнила задачу. Результат ИИ доступен для проверки.':status[a.status];
    $('#gc-decision').innerHTML=table===6&&a.status==='approval'?`<div class="gc-human-decision"><b>Рекомендация ИИ готова. Решение — за вами.</b><p>${s.order.quantity} подарков · ${s.order.total} ₽ · лимит ${s.config.budget} ₽</p><button data-gc-action="approve" ${s.order.total>s.config.budget?'disabled':''}>Согласовать закупку от имени капитана</button></div>`:'';
    const signature=JSON.stringify([s.id,table,a.status,a.output,s.events.length]);
    if(signature!==lastSignature){
      lastSignature=signature;
      const user=s.messages.filter(m=>m.table===table).map(m=>`<article class="gc-user-message"><small>ВЫ · ЧЕЛОВЕК СТАВИТ ЗАДАЧУ</small><p>${h(m.text)}</p></article>`).join('');
      const incoming=s.events.filter(e=>e.kind==='transfer'&&e.data?.to===table).map(e=>`<article class="gc-incoming"><small>ВХОДЯЩИЕ ДАННЫЕ · ${h(s.agents[e.data.from-1].name)}</small><p>${h(e.text)}</p></article>`).join('');
      const notes=s.events.filter(e=>e.kind==='dialogue'&&e.table===table).map(e=>`<article class="gc-agent-note"><small>ИИ-ПОМОЩНИК · ПОЯСНЕНИЕ ПО СЦЕНАРИЮ</small><p>${h(e.text)}</p></article>`).join('');
      $('#gc-history').innerHTML=incoming+user+notes+(a.output?`<article class="gc-agent-result"><small>РЕЗУЛЬТАТ ДЛЯ ПРОВЕРКИ ЧЕЛОВЕКОМ</small>${formatOutput(a.output)}</article>`:'');
      $('#gc-history').classList.toggle('empty-history',!$('#gc-history').innerHTML);
    }
    if(document.activeElement!==$('#gc-message'))$('#gc-message').value=drafts[table]||'';
    $('#gc-send').disabled=!ready(a)||busy;
    $('#gc-message').disabled=a.status==='done'||s.complete;
    $('#gc-attachments').innerHTML=(attached[table]||[]).map(f=>`<span>▤ ${h(f)}</span>`).join('');
    $('.gc-agent-picker').innerHTML=`＠ ${h(a.name)} <span>⌄</span>`;
  }
  async function send(){
    const table=selected,text=$('#gc-message').value.trim();
    if(!text||busy)return;
    busy=true;$('#gc-send').disabled=true;
    try {await window.submitTableMessage(table,text,'gigacowork-demo');drafts[table]='';$('#gc-message').value='';window.toast('Поручение передано ИИ-помощнику. Наблюдайте за ним на схеме.');}
    catch(e){window.toast(e.message)}
    finally {busy=false;render(latest,selected)}
  }
  function popover(content){$('#gc-popover').innerHTML=`<button class="gc-popover-close" data-gc-action="close" aria-label="Закрыть">×</button>${content}`;$('#gc-popover').classList.remove('hidden')}
  document.addEventListener('click',e=>{
    const table=e.target.closest('[data-cowork-table],[data-open-cowork]');
    if(table){window.selectTable(Number(table.dataset.coworkTable||table.dataset.openCowork),true);$('#gc-popover').classList.add('hidden');return}
    const suggestion=e.target.closest('[data-gc-suggest]');
    if(suggestion){const a=latest.agents[selected-1],index=Number(suggestion.dataset.gcSuggest);drafts[selected]=index===0?`Подготовь результат по задаче «${a.task}». Используй материалы стола и передай его коллегам.`:index===1?`Выполни расчёты для задачи «${a.task}», проверь данные и покажи итог для моего решения.`:`Выполни задачу «${a.task}» по демо-брифу и кратко поясни результат.`;$('#gc-message').value=drafts[selected];$('#gc-message').focus();return}
    const action=e.target.closest('[data-gc-action]')?.dataset.gcAction;
    if(!action)return;
    if(action==='approve')window.safe(()=>window.api('/api/action',{action:'approve'}));
    if(action==='close')$('#gc-popover').classList.add('hidden');
    if(action==='spaces'||action==='agents'||action==='search')popover(`<h3>Пространства столов</h3><p>Выберите команду и её ИИ-помощника.</p><div class="gc-agent-list">${latest.agents.map(a=>`<button data-cowork-table="${a.id}"><b>${String(a.id).padStart(2,'0')}</b>${h(a.name)}</button>`).join('')}</div>`);
    if(action==='personal'){window.selectTable(selected,true);$('#gc-message').focus()}
    if(action==='help')popover('<h3>Человек и ИИ работают вместе</h3><p>1. Выберите свой стол.<br>2. Напишите поручение или выберите подсказку.<br>3. Отправьте его ИИ-помощнику.<br>4. На схеме посмотрите действия и обмен данными.<br>5. Проверьте результат; закупку согласует человек.</p>');
    if(action==='context'){const a=latest.agents[selected-1];popover(`<h3>${h(a.name)} · контекст</h3><p>${h(a.instruction)}</p><h4>Демо-материалы</h4><ul>${files.map(f=>`<li>${h(f)}</li>`).join('')}</ul><p>Материалы синтетические. В этой версии прикрепление выбирает учебный контекст, а не загружает внешний файл.</p>`)}
    if(action==='attach')popover(`<h3>Добавить демо-материал</h3><p>Выберите подготовленный контекст для задания.</p>${files.map((f,i)=>`<button class="gc-file-choice" data-gc-file="${i}">▤ ${h(f)}</button>`).join('')}`);
  });
  document.addEventListener('click',e=>{const file=e.target.closest('[data-gc-file]');if(!file)return;const value=files[Number(file.dataset.gcFile)];attached[selected]||=[];if(!attached[selected].includes(value))attached[selected].push(value);render(latest,selected);$('#gc-popover').classList.add('hidden')});
  return {render};
})();

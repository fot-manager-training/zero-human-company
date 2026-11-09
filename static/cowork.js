/* Interactive training workspace inspired by the supplied GigaCoWork screenshot. */
window.CoWork = (() => {
  const h = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = s => document.querySelector(s);
  let latest=null, selected=1, busy=false, lastSignature='', lastGame=null;
  const drafts={}, attached={}, reviewChats={};
  const demo={active:false,paused:false,token:0,caption:'',stage:''};
  const suggestions = ['Подготовить документ','Посчитать или свести данные','Быстро разобраться в задаче'];
  const files = ['Демо-бриф мероприятия','Партнёрская база: 1 200 записей · выборка 108','Прайс: шар, упаковка, доставка','Демо-брендбук и макеты','Чек-лист приёмки'];
  const ready = a => a.status==='done'|| (!latest.started&&a.id===1)||(latest.started&&!latest.complete&&a.status==='ready');
  function shell(){
    $('#cowork-screen').innerHTML=`<div class="gc-app"><aside class="gc-rail"><span class="gc-rail-symbol">◫</span><button data-gc-action="search" aria-label="Найти стол">⌕</button><button class="selected" data-gc-action="spaces" aria-label="Все пространства">▱</button><button data-view="company" aria-label="Посмотреть работу команды">↗</button><div class="gc-rail-bottom"><button data-gc-action="help" aria-label="Как играть">?</button><span>УЧ</span></div></aside><aside class="gc-sidebar"><div class="gc-logo" aria-label="GigaCoWork">GIGA<br>COWORK</div><button data-gc-action="personal">Личное пространство</button><button data-gc-action="spaces">Все пространства</button><div class="gc-section-heading">Избранные <span>⌄</span></div><div id="gc-spaces"></div><button class="gc-muted" data-gc-action="spaces">Показать все столы</button><div class="gc-section-heading">Недавние <span>⌄</span></div><button id="gc-recent" data-gc-action="personal"></button><div class="gc-sidebar-note">Человек формулирует задачу.<br>ИИ готовит результат.<br>Человек проверяет и решает.</div></aside><main class="gc-main"><div class="gc-topbar"><button class="gc-back" data-gc-action="spaces">☰ Столы</button><div class="wb-view-tabs"><button data-wb-view="chat" class="active">Чат</button><button data-wb-view="data">Данные</button><button data-wb-view="reports">Документы</button></div><div class="gc-participants"><span>К</span><span>М</span><span>Д</span><span>П</span></div><label class="gc-select-wrap"><span class="sr-only">Рабочее место стола</span><select id="gc-table-select"></select></label><button class="gc-more" data-gc-action="context" aria-label="Контекст стола">⋮</button></div><div class="gc-content-layout"><div class="gc-work-area"><div class="gc-title"><h2 id="gc-role"></h2><p id="gc-task"></p></div><div id="gc-status" class="gc-status"></div><div id="gc-history" class="gc-history" aria-live="polite"></div><div class="gc-composer-wrap"><form id="gc-form" class="gc-composer"><label class="sr-only" for="gc-message">Поручение ИИ-помощнику</label><textarea id="gc-message" maxlength="4000" placeholder="Чем я могу помочь?" required></textarea><div id="gc-attachments" class="gc-attachments"></div><div class="gc-compose-tools"><div class="gc-tool-left"><button type="button" data-gc-action="attach" aria-label="Добавить демо-материал">＋</button><button type="button" data-gc-action="context" aria-label="Задание и контекст">▧</button><button type="button" class="gc-agent-picker" data-gc-action="agents">＠ Агент <span>⌄</span></button></div><button id="gc-send" type="submit" aria-label="Отправить поручение из GigaCoWork">↑</button></div></form><div class="gc-integrations"><div><span>Б</span><span>С</span><span>₽</span></div><button data-gc-action="context">Материалы стола <span>⌄</span></button></div></div><div class="gc-suggestions">${suggestions.map((s,i)=>`<button data-gc-suggest="${i}"><span>${['▤','◷','?'][i]}</span>${s}</button>`).join('')}</div><div id="gc-popover" class="gc-popover hidden"></div><button class="gc-watch" data-view="company">Наблюдать за помощью ИИ на схеме →</button></div><aside id="gc-workbench" class="gc-workbench"></aside></div><button class="gc-help" data-gc-action="help" aria-label="Помощь">?</button></main></div>`;
    $('#gc-message').oninput=e=>drafts[selected]=e.target.value;
    $('#gc-form').onsubmit=e=>{e.preventDefault();if(!demo.active)send()};
    $('#gc-message').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('#gc-form').requestSubmit()}};
    $('#gc-table-select').onchange=e=>window.selectTable(Number(e.target.value));
  }
  function formatOutput(output){return Object.entries(output).map(([k,v])=>`<div class="gc-result-row"><span>${h(k)}</span><b>${h(typeof v==='object'?Object.entries(v).map(([a,b])=>`Стол ${a}: ${b}`).join(' · '):v)}</b></div>`).join('')}
  function render(s,table){
    if(lastGame!==s.id){lastGame=s.id;for(const key of Object.keys(drafts))delete drafts[key];for(const key of Object.keys(attached))delete attached[key];for(const key of Object.keys(reviewChats))delete reviewChats[key];try{Object.assign(reviewChats,JSON.parse(localStorage.getItem('business-chats-'+s.id))||{})}catch{}lastSignature=''}
    latest=s;selected=table;
    if(!$('#gc-main')&&!$('#gc-form'))shell();
    const a=s.agents[table-1];
    $('#gc-table-select').innerHTML=s.agents.map(a=>`<option value="${a.id}" ${a.id===table?'selected':''}>Стол ${String(a.id).padStart(2,'0')}</option>`).join('');
    $('#gc-spaces').innerHTML=s.agents.map(a=>`<button data-cowork-table="${a.id}" class="${a.id===table?'active':''}">${h(a.name)}</button>`).join('');
    $('#gc-recent').textContent=a.name;
    $('#gc-role').textContent=a.name;$('#gc-task').textContent=a.task;
    const status={waiting:'Сначала дождитесь входных данных от коллег.',ready:'Ваш ход: задайте поручение ИИ-помощнику.',working:'ИИ помогает с задачей. Его действия видны на схеме.',approval:'ИИ подготовил заказ. Капитан команды должен согласовать закупку.',done:'Помощник подготовил результат и передал его коллегам.'};
    $('#gc-status').textContent=!s.started?(table===1?'Начните с поручения: что подготовить, для кого и к какому сроку.':'Сначала стол 01 запускает общее поручение.'):s.complete?'Команда выполнила задачу. Результат ИИ доступен для проверки.':status[a.status];
    const decision=table===6&&a.status==='approval'?`<div class="gc-human-decision"><b>Рекомендация ИИ готова. Решение — за вами.</b><p>${s.order.quantity} подарков · ${s.order.total} ₽ · лимит ${s.config.budget} ₽</p><button data-gc-action="approve" ${s.order.total>s.config.budget?'disabled':''}>Согласовать закупку от имени капитана</button></div>`:'';
    const signature=JSON.stringify([s.id,table,a.status,a.output,s.events.length,reviewChats[table]]);
    if(signature!==lastSignature){
      lastSignature=signature;
      const history=$('#gc-history'),oldScroll=history.scrollTop;
      const follow=demo.active||history.scrollHeight-history.clientHeight-oldScroll<40;
      const user=s.messages.filter(m=>m.table===table).map(m=>`<article class="gc-user-message"><small>ВЫ · ЧЕЛОВЕК СТАВИТ ЗАДАЧУ</small><p>${h(m.text)}</p></article>`).join('');
      const incoming=s.events.filter(e=>e.kind==='transfer'&&e.data?.to===table).map(e=>`<article class="gc-incoming"><small>ВХОДЯЩИЕ ДАННЫЕ · ${h(s.agents[e.data.from-1].name)}</small><p>${h(e.text)}</p></article>`).join('');
      const notes=s.events.filter(e=>e.kind==='dialogue'&&e.table===table).map(e=>`<article class="gc-agent-note"><small>ИИ-ПОМОЩНИК · ПОЯСНЕНИЕ ПО СЦЕНАРИЮ</small><p>${h(e.text)}</p></article>`).join('');
      const review=(reviewChats[table]||[]).map(m=>`<article class="${m.speaker==='user'?'gc-user-message gc-review-question':'gc-agent-note gc-review-reply'}"><small>${m.speaker==='user'?'УЧАСТНИК · УТОЧНЕНИЕ':'ИИ-ПОМОЩНИК · ОТВЕТ'}</small><p>${h(m.text)}</p></article>`).join('');
      $('#gc-history').innerHTML=incoming+user+notes+(a.output?`<article class="gc-agent-result"><small>РЕЗУЛЬТАТ ДЛЯ ПРОВЕРКИ ЧЕЛОВЕКОМ</small>${formatOutput(a.output)}</article>`:'')+review+window.Workbench.chatArtifacts(s,table)+decision;
      $('#gc-history').classList.toggle('empty-history',!$('#gc-history').innerHTML);
      history.scrollTop=follow?history.scrollHeight:oldScroll;
    }
    if(document.activeElement!==$('#gc-message'))$('#gc-message').value=drafts[table]||'';
    $('#gc-send').disabled=!ready(a)||busy||demo.active;
    $('#gc-message').readOnly=demo.active;
    $('#gc-message').disabled=false;
    $('#gc-attachments').innerHTML=(attached[table]||[]).map(f=>`<span>▤ ${h(f)}</span>`).join('');
    window.Workbench.render(s,table);
    renderDemoControls();
    $('.gc-agent-picker').innerHTML=`＠ ${h(a.name)} <span>⌄</span>`;
  }
  async function send(){
    const table=selected,text=$('#gc-message').value.trim();
    if(!text||busy)return;
    busy=true;$('#gc-send').disabled=true;
    try {if(latest.agents[table-1].status==='done'){await manualFollowup(table,text);return true;}await window.submitTableMessage(table,text,'gigacowork-demo');drafts[table]='';$('#gc-message').value='';if(!demo.active)window.toast('Поручение передано ИИ-помощнику. Наблюдайте за ним на схеме.');return true;}
    catch(e){window.toast(e.message);return false}
    finally {busy=false;render(latest,selected)}
  }
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function renderDemoControls(){
    const status=$('#gc-demo-status');if(!status)return;
    if($('#gc-table-select'))$('#gc-table-select').disabled=demo.active;
    document.querySelectorAll('[data-cowork-table],[data-gc-suggest],.gc-agent-picker').forEach(el=>el.disabled=demo.active);
    status.textContent=demo.caption;
    document.querySelectorAll('[data-start-table-demo]').forEach(el=>el.disabled=demo.active);
    $('#gc-demo-pause').disabled=!demo.active;$('#gc-demo-pause').textContent=demo.paused?'▶ Продолжить':'Ⅱ Пауза';
    $('#gc-demo-stop').disabled=!demo.active;
    if(document.activeElement!==$('#gc-demo-speed'))$('#gc-demo-speed').value=latest?.config.speed||2;
    $('.gc-app')?.classList.toggle('is-typing',demo.active&&demo.stage.includes('typing')&&!demo.paused);
  }
  function cancelDemo(){
    demo.active=false;demo.paused=false;demo.token++;demo.stage='';
    demo.caption='Автопоказ остановлен. Можно продолжить работу вручную.';
    if($('#gc-message'))$('#gc-message').readOnly=false;
    renderDemoControls();
  }
  async function checkpoint(token){
    while(demo.active&&demo.token===token&&demo.paused)await sleep(60);
    if(!demo.active||demo.token!==token)throw Error('DEMO_STOPPED');
  }
  async function delay(ms,token){
    let elapsed=0;
    while(elapsed<ms){await checkpoint(token);const slice=Math.min(60,ms-elapsed);await sleep(slice);elapsed+=slice}
    await checkpoint(token);
  }
  async function until(predicate,token){
    for(let attempt=0;attempt<900;attempt++){await checkpoint(token);if(predicate())return;await sleep(100)}
    throw Error('Не удалось дождаться следующего шага. Остановите автопоказ и проверьте состояние игры.');
  }
  function caption(text,stage=''){demo.caption=text;demo.stage=stage;renderDemoControls()}
  function promptFor(id){
    return {
      1:'Помоги подготовить новогодние подарки для партнёров к 10 декабря. Рассчитай количество по списку и передай задачи коллегам.',
      2:`Проверь список партнёров, исключи повторяющиеся записи и добавь резерв ${latest.config.reserve}%. Покажи расчёт тиража для моего решения.`,
      3:'Помоги составить полную смету: учти шары, упаковку и доставку. Сравни сумму с лимитом и передай расчёт закупкам.',
      4:`Подготовь демо-макет ${latest.config.design} для новогоднего шара. Укажи цвет, логотип и версию, затем передай на бренд-контроль.`,
      5:'Проверь макет: правильный логотип, пропорции, цвет и читаемость. Верни понятный результат проверки для команды.',
      6:'Собери тираж, смету и проверенный макет в заказ. Покажи мне рекомендацию перед отправкой поставщику: решение о закупке приму я.',
      7:'Подтверди выпуск согласованной партии. Посчитай коробки и подготовь данные для логистики по демо-сценарию.',
      8:'Помоги организовать доставку на площадку к 10 декабря. Проверь адрес, срок и число коробок, затем уведомь приёмку.',
      9:'Сверь прибывшую партию с заказом и демо-актом. Проверь количество, упаковку и макет; покажи расхождения, если они есть.',
      10:'Подготовь для команды план выдачи: по одному подарку гостю за десятью столами. Отдельно покажи оставшийся резерв.'
    }[id];
  }
  async function typeInto(text,token){
    drafts[selected]='';$('#gc-message').value='';$('#gc-message').focus({preventScroll:true});
    for(const letter of text){await checkpoint(token);drafts[selected]+=letter;$('#gc-message').value=drafts[selected];$('#gc-message').scrollTop=$('#gc-message').scrollHeight;await delay(Math.max(9,65/latest.config.speed),token)}
  }
  function persistReviews(){try{localStorage.setItem('business-chats-'+latest.id,JSON.stringify(reviewChats))}catch{}}
  async function exchange(id,pair,token){
    caption(`Стол ${String(id).padStart(2,'0')} · участник ставит аналитическую задачу.`, 'review-typing');
    await typeInto(pair[0],token);await delay(Math.max(300,1500/latest.config.speed),token);
    reviewChats[id]||=[];reviewChats[id].push({speaker:'user',text:pair[0]});
    drafts[id]='';$('#gc-message').value='';render(latest,id);
    caption(`Стол ${String(id).padStart(2,'0')} · помощник анализирует данные и готовит документ.`, 'reply');
    await delay(Math.max(450,2600/latest.config.speed),token);
    const reply={speaker:'agent',text:''};reviewChats[id].push(reply);
    const chunks=pair[1].match(/\S+\s*/g)||[];
    for(let i=0;i<chunks.length;i+=3){await checkpoint(token);reply.text+=chunks.slice(i,i+3).join('');render(latest,id);await delay(Math.max(32,220/latest.config.speed),token)}
    for(const doc of pair[2]||[])window.Workbench.prepare(latest,id,doc,!!pair[3]);
    lastSignature='';persistReviews();render(latest,id);
    caption(`Стол ${String(id).padStart(2,'0')} · команда изучает таблицы и проверяет выводы.`, 'review');
    await delay(Math.max(1400,9000/latest.config.speed),token);
  }
  async function reviewDialogue(id,token){
    for(const pair of window.Workbench.dialogues(latest,id))await exchange(id,pair,token);
  }
  async function manualFollowup(id,text){
    const pair=window.Workbench.answer(latest,id,text);reviewChats[id]||=[];
    reviewChats[id].push({speaker:'user',text});drafts[id]='';$('#gc-message').value='';
    const reply={speaker:'agent',text:''};reviewChats[id].push(reply);
    const gameId=latest.id;const chunks=pair[1].match(/\S+\s*/g)||[];
    for(let i=0;i<chunks.length;i+=4){if(latest.id!==gameId)return;reply.text+=chunks.slice(i,i+4).join('');render(latest,id);await sleep(35)}
    for(const doc of pair[2]||[])window.Workbench.prepare(latest,id,doc,!!pair[3]);
    persistReviews();lastSignature='';render(latest,id);
  }
  async function startDemo(){
    if(demo.active)return;
    if(latest.started){window.toast('Сначала начните новую игру для показа ввода за столами.');return}
    demo.active=true;demo.paused=false;const token=++demo.token;
    try{
      await window.api('/api/config',{auto_approve:false});await window.api('/api/action',{action:'set-mode',auto:false});
      for(const id of [1,2,4,3,5,6,7,8,9,10]){
        await until(()=>id===1&&!latest.started||latest.agents[id-1].status==='ready',token);
        window.selectTable(id,true,true);window.Workbench.showChat();
        caption(`Стол ${String(id).padStart(2,'0')} · участники формулируют поручение своему ИИ-помощнику.`, 'typing');
        await typeInto(promptFor(id),token);
        await delay(Math.max(350,1500/latest.config.speed),token);
        caption(`Стол ${String(id).padStart(2,'0')} · участник отправляет поручение. ИИ помогает с задачей.`, 'working');
        $('#gc-send').disabled=false;$('#gc-send').classList.add('demo-click');
        if(!await send())throw Error('Поручение не принято. Проверьте состояние стола.');
        $('#gc-send').classList.remove('demo-click');
        if(id===6){
          await until(()=>latest.agents[5].status==='approval',token);
          caption('Стол 06 · капитан проверяет рекомендацию ИИ и принимает решение о закупке. Это автопоказ действий человека.', 'review');
          if(latest.order.total>latest.config.budget)throw Error('Команда заметила превышение бюджета. Начните новую игру с достаточным лимитом.');
          await delay(Math.max(1200,6000/latest.config.speed),token);
          const approve=$('[data-gc-action="approve"]');approve?.classList.add('demo-click');
          await delay(200,token);await window.api('/api/action',{action:'approve',synthetic:true});
        }
        await until(()=>latest.agents[id-1].status==='done',token);
        caption(`Стол ${String(id).padStart(2,'0')} · участники проверяют подготовленный ИИ результат.`, 'review');
        await delay(Math.max(1400,6500/latest.config.speed),token);
        await reviewDialogue(id,token);
      }
      caption('');
    }catch(e){if(e.message!=='DEMO_STOPPED'){caption(e.message);window.toast(e.message)}}
    finally{if(demo.token===token){demo.active=false;demo.paused=false;demo.stage='';render(latest,selected)}}
  }
  async function pauseDemo(){
    if(!demo.active)return;demo.paused=!demo.paused;renderDemoControls();
    if(latest.started&&!latest.complete)await window.api('/api/action',{action:demo.paused?'pause':'resume'});
  }
  async function stopDemo(){
    cancelDemo();
    for(let i=0;i<30&&busy;i++)await sleep(100);
    if(latest.started&&latest.running&&!latest.complete)await window.api('/api/action',{action:'pause'});
    render(latest,selected);
  }
  function popover(content){$('#gc-popover').innerHTML=`<button class="gc-popover-close" data-gc-action="close" aria-label="Закрыть">×</button>${content}`;$('#gc-popover').classList.remove('hidden')}
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-start-table-demo]')){window.safe(()=>window.requestTableDemo());return}
    if(e.target.closest('#gc-demo-pause')){window.safe(pauseDemo);return}
    if(e.target.closest('#gc-demo-stop')){window.safe(stopDemo);return}
    const table=e.target.closest('[data-cowork-table],[data-open-cowork]');
    if(table){window.selectTable(Number(table.dataset.coworkTable||table.dataset.openCowork),true);$('#gc-popover').classList.add('hidden');return}
    const suggestion=e.target.closest('[data-gc-suggest]');
    if(suggestion){const a=latest.agents[selected-1],index=Number(suggestion.dataset.gcSuggest);drafts[selected]=a.status==='done'?['Сформируй подробный отчёт по результатам работы с таблицами и выводами.','Проанализируй данные, покажи статистику и контрольные суммы.','Доработай документ: добавь рекомендации и сохрани новую версию.'][index]:index===0?`Подготовь результат по задаче «${a.task}». Используй материалы стола и передай его коллегам.`:index===1?`Выполни расчёты для задачи «${a.task}», проверь данные и покажи итог для моего решения.`:`Выполни задачу «${a.task}» по демо-брифу и кратко поясни результат.`;$('#gc-message').value=drafts[selected];$('#gc-message').focus({preventScroll:true});return}
    const action=e.target.closest('[data-gc-action]')?.dataset.gcAction;
    if(!action)return;
    if(action==='approve')window.safe(()=>window.api('/api/action',{action:'approve'}));
    if(action==='close')$('#gc-popover').classList.add('hidden');
    if(action==='spaces'||action==='agents'||action==='search')popover(`<h3>Пространства столов</h3><p>Выберите команду и её ИИ-помощника.</p><div class="gc-agent-list">${latest.agents.map(a=>`<button data-cowork-table="${a.id}"><b>${String(a.id).padStart(2,'0')}</b>${h(a.name)}</button>`).join('')}</div>`);
    if(action==='personal'){window.selectTable(selected,true);$('#gc-message').focus({preventScroll:true})}
    if(action==='help')popover('<h3>Человек и ИИ работают вместе</h3><p>1. Выберите свой стол.<br>2. Напишите поручение или выберите подсказку.<br>3. Отправьте его ИИ-помощнику.<br>4. На схеме посмотрите действия и обмен данными.<br>5. Проверьте результат; закупку согласует человек.</p>');
    if(action==='context'){const a=latest.agents[selected-1];popover(`<h3>${h(a.name)} · контекст</h3><p>${h(a.instruction)}</p><h4>Демо-материалы</h4><ul>${files.map(f=>`<li>${h(f)}</li>`).join('')}</ul><p>Материалы синтетические. В этой версии прикрепление выбирает учебный контекст, а не загружает внешний файл.</p>`)}
    if(action==='attach')popover(`<h3>Добавить демо-материал</h3><p>Выберите подготовленный контекст для задания.</p>${files.map((f,i)=>`<button class="gc-file-choice" data-gc-file="${i}">▤ ${h(f)}</button>`).join('')}`);
  });
  document.addEventListener('click',e=>{const file=e.target.closest('[data-gc-file]');if(!file)return;const value=files[Number(file.dataset.gcFile)];attached[selected]||=[];if(!attached[selected].includes(value))attached[selected].push(value);render(latest,selected);$('#gc-popover').classList.add('hidden')});
  document.addEventListener('change',e=>{if(e.target.id==='gc-demo-speed')window.safe(()=>window.api('/api/config',{speed:Number(e.target.value)}))});
  return {render,startDemo,cancelDemo,isPlaying:()=>demo.active};
})();

/* Process map and transcript consume the same events as the game engine. */
window.GameVisuals = (() => {
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = s => document.querySelector(s);
  const names = ['Ведущий / участник','Гендиректор','Партнёры','Финансы','Дизайн','Бренд-контроль','Закупки','Производитель','Логистика','Приёмка','Выдача'];
  const status = {waiting:'Ожидает входящие данные',ready:'Ваш ход',working:'Работает',approval:'Ждёт решения ведущего',done:'Результат передан'};
  const points = {1:[110,205],2:[330,110],3:[550,110],4:[330,320],5:[550,320],6:[790,205],7:[1030,205],8:[1030,515],9:[790,515],10:[550,515],0:[290,515]};
  const links = [
    [1,2,'M200 180 C235 180 215 110 240 110','Посчитать тираж',140,105],
    [1,4,'M200 230 C235 230 215 320 240 320','Нужен макет',140,340],
    [2,3,'M420 110 L460 110','Тираж',440,92],
    [2,6,'M330 22 V8 H790 V117','Тираж',680,20],
    [3,6,'M640 110 C675 110 665 180 700 180','Смета',673,132],
    [4,5,'M420 320 L460 320','Макет',440,302],
    [5,6,'M640 320 C680 320 665 230 700 230','OK',677,286],
    [6,7,'M880 205 H940','Заказ',910,185],
    [7,8,'M1030 315 V431','Партия в доставку',1030,370],
    [8,9,'M940 515 H880','Прибыло',910,494],
    [9,10,'M700 515 H640','Акт',670,494],
    [10,0,'M460 515 H385','План выдачи',424,494],
  ];
  function summary(a,o) {
    return ({1:'Бриф → две ветки',2:o.quantity?`${o.quantity} шт. · резерв ${o.reserve}`:'108 записей → без дублей',3:o.total?`${o.total.toLocaleString('ru-RU')} ₽`:'Шары + упаковка + доставка',4:o.version?`Макет ${o.design} · ${o.version}`:'Подготовить версию макета',5:'Логотип · пропорции · цвет',6:a.status==='done'?'Заказ передан производителю':'Тираж + смета + макет',7:o.boxes?`${o.quantity} шт. · ${o.boxes} коробок`:'Изготовить и упаковать',8:'Производитель → площадка',9:o.accepted?`Принято ${o.accepted} шт.`:'Сверить партию с заказом',10:o.distributed?`100 выдать · ${o.reserve} запас`:'По 10 подарков на стол'})[a.id];
  }
  const actions = {
    1:['Структурирую поручение','Уточню поля, чтобы команда не потеряла задачу.'],
    2:['Считаю получателей','Уберу повторы: один подарок на партнёра.'],
    3:['Проверяю бюджет','Учту упаковку и доставку, чтобы смета была полной.'],
    4:['Готовлю макет','Зафиксирую версию, чтобы все работали с одним файлом.'],
    5:['Проверяю бренд','Сверю логотип и читаемость до отправки заказа.'],
    6:['Собираю заказ','Проверю три входа; решение о закупке — за капитаном.'],
    7:['Готовлю партию','Посчитаю коробки, чтобы логист знал объём.'],
    8:['Организую доставку','Проверю адрес и срок, чтобы команда успела к событию.'],
    9:['Сверяю приёмку','Сравню заказ и факт, чтобы заметить расхождения.'],
    10:['Готовлю план выдачи','Оставлю резерв для дополнительных гостей.']
  };
  let activeGame=null, seen=new Set(), movers=[], snapshot=null, previousFrame=performance.now();
  const ns='http://www.w3.org/2000/svg';
  function brief(e,s){return ({1:e.data.to===2?'Рассчитай тираж по списку':'Подготовь макет для команды',2:`${s.order.quantity} подарков, без дублей`,3:`Полная смета: ${s.order.total} ₽`,4:`Макет ${s.order.design}, версия ${s.order.version}`,5:'Макет проверен, можно заказывать',6:`Заказ на ${s.order.quantity} подарков`,7:`Партия: ${s.order.boxes} коробок`,8:'Партия прибыла на площадку',9:`Принято ${s.order.accepted} подарков`,10:`100 к выдаче, ${s.order.reserve} в резерве`})[e.data.from]||'Передаю результат'}
  function makeMover(e,s){
    const layer=$('#motion-layer');
    const route=links.find(l=>l[0]===e.data.from&&l[1]===e.data.to);
    if(!layer||!route)return;
    const start=points[e.data.from],end=points[e.data.to];
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',route[2]);
    path.setAttribute('fill','none');path.setAttribute('stroke','none');layer.appendChild(path);
    const person=document.createElementNS(ns,'g');person.setAttribute('class','running-agent');person.setAttribute('aria-label',`${names[e.data.from]} передаёт информацию: ${e.text}`);
    const c=['#607aa8','#6e9e88','#ae9765','#a58bb4','#6c9d9c','#7b8da4','#c29a6a','#6c9eaf','#859f79','#b98c94'][e.data.from-1];
    person.innerHTML=`<ellipse cx="0" cy="26" rx="22" ry="6" fill="#45674a28"/><g class="runner-body"><path class="run-leg left-leg" d="M-5 7L-13 23" stroke="#475d51" stroke-width="7" stroke-linecap="round"/><path class="run-leg right-leg" d="M5 7L14 23" stroke="#475d51" stroke-width="7" stroke-linecap="round"/><path d="M-15 5Q-15-20 0-20Q15-20 15 5Z" fill="${c}"/><circle cy="-31" r="11" fill="#f1cfaf"/><path d="M-11-32Q-12-46 0-45Q12-45 11-31L6-38Q0-34-8-38Z" fill="#595147"/><circle cx="-4" cy="-31" r="1.1"/><circle cx="4" cy="-31" r="1.1"/><path class="run-arm" d="M-12-12L-23-2M12-12L24-20" stroke="${c}" stroke-width="7" stroke-linecap="round"/><rect x="17" y="-34" width="20" height="26" rx="3" fill="#fff" stroke="#5c967a" stroke-width="1.5"/><path d="M21-26H32M21-21H32M21-16H29" stroke="#86ad96" stroke-width="1.5"/></g>`;
    const bubble=document.createElementNS(ns,'g');bubble.setAttribute('class','moving-message');bubble.style.display='none';
    bubble.innerHTML=`<rect x="-160" y="-32" width="320" height="68" rx="10"/><text y="-11">${h(names[e.data.from])} → ${h(names[e.data.to])}</text><text class="packet-text" y="10">${h(brief(e,s))}</text><text class="packet-caption" y="26">Агент доставляет информацию коллеге</text>`;
    layer.appendChild(person);layer.appendChild(bubble);
    movers.push({event:e,path,person,bubble,length:path.getTotalLength(),progress:0});
  }
  function animate(now){
    const delta=Math.min(100,now-previousFrame);previousFrame=now;
    const paused=snapshot&&!snapshot.running&&!snapshot.complete;
    let relayout=false;
    const visible=movers.slice(-3);
    if(snapshot)for(const m of [...movers]){
      if(!paused)m.progress+=delta/Math.max(650,2800/snapshot.config.speed);
      const p=m.path.getPointAtLength(m.length*Math.min(1,m.progress));
      m.person.setAttribute('transform',`translate(${p.x},${p.y})`);
      const slot=visible.indexOf(m);
      m.bubble.style.display=slot<0?'none':'';
      if(slot>=0)m.bubble.setAttribute('transform',`translate(${[210,575,940][slot]},710)`);
      m.person.classList.toggle('paused',paused);
      const stride=Math.sin(m.progress*45)*9;
      m.person.querySelector('.left-leg').setAttribute('d',`M-5 7L${-8+stride} 23`);
      m.person.querySelector('.right-leg').setAttribute('d',`M5 7L${8-stride} 23`);
      if(m.progress>=1){m.path.remove();m.person.remove();m.bubble.remove();movers=movers.filter(x=>x!==m);relayout=true}
    }
    if(relayout&&snapshot)graph(snapshot);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  function graph(s) {
    const sent = s.events.filter(e=>e.kind==='transfer');
    const last = sent.at(-1);
    let svg = `<svg class="process-svg" viewBox="0 -35 1150 840" role="group"><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#9eb5aa"/></marker><marker id="flow-arrow-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2b9874"/></marker></defs><rect x="220" y="18" width="445" height="197" rx="18" fill="#f0f5fb"/><rect x="220" y="230" width="445" height="197" rx="18" fill="#f5f1f8"/><text x="235" y="-8" class="branch-title">ВЕТКА 1 · КОЛИЧЕСТВО И БЮДЖЕТ</text><text x="235" y="228" class="branch-title">ВЕТКА 2 · МАКЕТ И ПРОВЕРКА</text><text x="730" y="420" class="branch-title">ИСПОЛНЕНИЕ И ВЫДАЧА ←</text>`;
    for (const [from,to,path,label,x,y] of links) {
      const done = sent.some(e=>e.data?.from===from&&e.data?.to===to);
      const active = s.running && last?.data?.from===from;
      const id=`edge-${from}-${to}`;
      svg+=`<path id="${id}" d="${path}" class="flow-edge ${done?'sent':''}" marker-end="url(#flow-arrow${done?'-done':''})"/><rect x="${x-label.length*2.75-5}" y="${y-12}" width="${label.length*5.5+10}" height="19" rx="5" fill="#f8faf8"/><text x="${x}" y="${y+1}" class="edge-label">${h(label)}</text>`;

    }
    svg+=`<g class="human-node" data-open-cowork="1" tabindex="0" role="button" aria-label="Поставить задачу ИИ-помощнику" transform="translate(110,53)"><circle r="21" fill="#e7efe8"/><circle cy="-5" r="6" fill="#6e907c"/><path d="M-10 12Q-10 0 0 0T10 12" fill="#6e907c"/><text y="39">Человек ставит задачу</text></g><path d="M110 96V117" class="flow-edge" marker-end="url(#flow-arrow)"/>`;
    const involved=new Set(s.agents.filter(a=>['working','approval'].includes(a.status)).map(a=>a.id));
    for(const m of movers){involved.add(m.event.data.from);involved.add(m.event.data.to)}
    if(activeGame===s.id)for(const e of sent)if(!seen.has(e.id)){involved.add(e.data.from);involved.add(e.data.to)}
    for(const a of s.agents){
      const [x,y]=points[a.id],expanded=involved.has(a.id);
      const human=window.avatar(a).replace('<svg viewBox=',expanded?'<svg x="-25" y="-78" width="50" height="47" viewBox=':'<svg x="-67" y="-24" width="44" height="44" viewBox=');
      const outgoing=[...sent].reverse().find(e=>e.data.from===a.id);
      const note=a.status==='approval'?['Решение принимает человек','ИИ подготовил рекомендацию. Капитан, согласуйте закупку.']:a.status==='working'?actions[a.id]:['Передаю информацию',outgoing?brief(outgoing,s):'Получил данные от коллеги. Готовлю следующий шаг.'];
      svg+=`<g class="flow-node agent ${a.status} ${expanded?'expanded':'collapsed'}" data-agent="${a.id}" tabindex="0" role="button" aria-label="Стол ${a.id}: ${h(a.name)}, ${status[a.status]}" transform="translate(${x},${y})"><rect class="node-card" x="${expanded?-90:-72}" y="${expanded?-82:-26}" width="${expanded?180:144}" height="${expanded?190:52}" rx="12"/>${expanded?`<text class="node-number" x="-76" y="-61">${String(a.id).padStart(2,'0')}</text>`:''}${human}<text class="node-name" x="${expanded?0:20}" y="${expanded?-16:-2}">${h(names[a.id])}</text>${expanded?`<text class="node-summary" y="3">${h(summary(a,s.order))}</text><text class="node-status" y="22">${h(status[a.status])}</text><foreignObject x="-81" y="32" width="162" height="67"><div xmlns="http://www.w3.org/1999/xhtml" class="map-explanation"><b>${h(note[0])}</b><span>${h(note[1])}</span><small>Пояснение по сценарию</small></div></foreignObject>`:`<text class="node-status" x="20" y="15">${a.status==='done'?'✓ Помог команде':a.status==='ready'?'Ваш ход':'Ждёт свою задачу'}</text>`}</g>`;
    }
    svg+=`<g transform="translate(290,515)"><rect x="-94" y="-55" width="188" height="110" rx="14" fill="${s.complete?'#e3f4e8':'#f0f4f1'}" stroke="#c6ddcd"/><text y="-17" class="finish-icon">${s.complete?'✓':'✧'}</text><text y="10" class="node-name">Команда вручает подарки</text><text y="32" class="node-summary">100 подарков + резерв</text></g><rect x="20" y="650" width="1110" height="113" rx="14" fill="#f1f6f2" stroke="#e1eae2"/><text x="40" y="673" class="branch-title">ЧТО ПЕРЕДАЮТ ПОМОЩНИКИ ДРУГ ДРУГУ</text><text x="25" y="790" class="branch-title">Человечки доставляют данные. В облачках — сообщения и краткие пояснения действий по сценарию.</text></svg>`;
    if(!$('#map-base'))$('#process-map').innerHTML='<div id="map-base"></div><svg id="motion-layer" class="motion-layer" viewBox="0 -35 1150 840" aria-hidden="true"></svg>';
    $('#map-base').innerHTML=svg;
    snapshot=s;
    if(activeGame!==s.id){activeGame=s.id;seen=new Set(s.events.map(e=>e.id));movers=[];$('#motion-layer').innerHTML=''}
    for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);if(e.kind==='transfer')makeMover(e,s)}
  }
  function conversation(e,s){
    const from=(e.kind==='ingress'||(e.kind==='human'&&e.data))?0:e.data?.from??e.table??0;
    const to=e.kind==='transfer'?e.data.to:e.kind==='human'?(e.data?.synthetic?6:0):e.kind==='ingress'?e.table:null;
    const kind=e.kind==='transfer'?'ПЕРЕДАЧА РЕЗУЛЬТАТА':e.kind==='dialogue'?'РАБОТА АГЕНТА':e.kind==='ingress'?'ВХОДЯЩИЙ ЗАПРОС':e.data?.synthetic?'ЭМУЛЯЦИЯ РЕШЕНИЯ':'РЕШЕНИЕ ЧЕЛОВЕКА';
    return `<article class="agent-message-row ${e.kind}"><div class="speaker-badge">${from===0?'Ч':String(from).padStart(2,'0')}</div><div class="message-content"><div class="message-route"><b>${h(names[from])}</b>${to!==null?`<span>→</span><b>${h(names[to])}</b>`:''}<time>${new Date(e.time*1000).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow'})} МСК</time></div><p>${h(e.text)}</p><span class="message-kind">${kind} · СИНТЕТИКА</span></div></article>`;
  }
  function render(s){
    graph(s);
    const active=s.agents.filter(a=>a.status==='working');
    const gate=s.agents[5].status==='approval';
    $('#now-doing').classList.toggle('hidden',s.complete);
    if(s.complete)$('#now-doing').innerHTML='';
    else $('#now-doing').innerHTML=`<span class="live-dot"></span><div><b id="game-status">${!s.started?'Начните с задачи человека':!s.running?'Прогон на паузе':gate?'Решение ведущего':active.length?active.map(a=>names[a.id]).join(' + '):'Ожидание поручения'}</b><span>${!s.started?'Откройте GigaCoWork своего стола или запустите пример совместной работы.':gate?(s.config.auto_approve?'В этом автопоказе решение капитана воспроизводится по сценарию.':'Нажмите «Согласовать» под схемой.'):active.length?active.map(a=>a.task).join(' · '):'Все результаты и сообщения сохраняются в журнале.'}</span></div>`;
    if(gate)$('#now-doing').insertAdjacentHTML('beforeend',`<button data-scene-approve class="button primary-button" ${s.order.total>s.config.budget?'disabled':''}>${s.order.total>s.config.budget?'Лимит превышен':`Согласовать ${s.order.total.toLocaleString('ru-RU')} ₽`}</button>`);
    const messages=s.events.filter(e=>['transfer','dialogue','human','ingress'].includes(e.kind));
    $('#conversation-preview').innerHTML=messages.filter(e=>!(e.kind==='transfer'&&e.data?.to===0)).slice(-3).map(e=>conversation(e,s)).join('')||'<div class="empty">Запустите автопрогон — здесь появится переписка с конкретными результатами.</div>';
    const filter=$('#conversation-filter');
    if(filter.options.length===1)filter.innerHTML+=[0,...s.agents.map(a=>a.id)].map(n=>`<option value="${n}">${h(names[n])}</option>`).join('');
    const value=filter.value;
    $('#conversation-list').innerHTML=messages.filter(e=>value==='all'||e.table===Number(value)||e.data?.to===Number(value)).map(e=>conversation(e,s)).join('')||'<div class="empty">Пока нет сообщений. Запустите игру или выберите другой стол.</div>';
    document.querySelectorAll('[data-speed]').forEach(el=>el.classList.toggle('active',Number(el.dataset.speed)===s.config.speed));
    $('#flow-pause').disabled=!s.started||s.complete;
    $('#flow-pause').textContent=s.running?'Ⅱ Пауза':'▶ Продолжить';
    $('#quick-demo').textContent=s.complete?'↺ Повторить автопрогон':s.started?'↺ Повторить совместную работу':'▶ Показать совместную работу';
  }
  return {render};
})();

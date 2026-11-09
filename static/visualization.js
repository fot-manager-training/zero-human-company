/* Process map and transcript consume the same events as the game engine. */
window.GameVisuals = (() => {
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = s => document.querySelector(s);
  const names = ['Ведущий / участник','Гендиректор','Партнёры','Финансы','Дизайн','Бренд-контроль','Закупки','Производитель','Логистика','Приёмка','Выдача'];
  const status = {waiting:'Ожидает входящие данные',ready:'Ваш ход',working:'Работает',approval:'Ждёт решения ведущего',done:'Результат передан'};
  const points = {1:[110,205],2:[330,110],3:[550,110],4:[330,320],5:[550,320],6:[790,205],7:[1030,205],8:[1030,515],9:[790,515],10:[550,515],0:[290,515]};
  const links = [
    [1,2,'M200 180 C235 180 215 110 240 110','Посчитать тираж',140,105],
    [1,4,'M200 230 C235 230 215 320 240 320','Нужен макет',140,320],
    [2,3,'M420 110 L460 110','Тираж',440,92],
    [2,6,'M330 42 V22 H790 V137','Тираж',680,20],
    [3,6,'M640 110 C675 110 665 180 700 180','Смета',673,132],
    [4,5,'M420 320 L460 320','Макет v1',440,302],
    [5,6,'M640 320 C680 320 665 230 700 230','Бренд: OK',677,286],
    [6,7,'M880 205 H940','Заказ',910,185],
    [7,8,'M1030 273 V447','Партия в доставку',1030,370],
    [8,9,'M940 515 H880','Прибыло',910,494],
    [9,10,'M700 515 H640','Акт приёмки',670,494],
    [10,0,'M460 515 H385','План выдачи',424,494],
  ];
  function summary(a,o) {
    return ({1:'Бриф → две ветки',2:o.quantity?`${o.quantity} шт. · резерв ${o.reserve}`:'108 записей → без дублей',3:o.total?`${o.total.toLocaleString('ru-RU')} ₽`:'Шары + упаковка + доставка',4:o.version?`Макет ${o.design} · ${o.version}`:'Подготовить версию макета',5:'Логотип · пропорции · цвет',6:a.status==='done'?'Заказ передан производителю':'Тираж + смета + макет',7:o.boxes?`${o.quantity} шт. · ${o.boxes} коробок`:'Изготовить и упаковать',8:'Производитель → площадка',9:o.accepted?`Принято ${o.accepted} шт.`:'Сверить партию с заказом',10:o.distributed?`100 выдать · ${o.reserve} запас`:'По 10 подарков на стол'})[a.id];
  }
  function graph(s) {
    const sent = s.events.filter(e=>e.kind==='transfer');
    const last = sent.at(-1);
    let svg = `<svg class="process-svg" viewBox="0 0 1150 635" role="group" aria-label="Движение заказа между десятью агентами"><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#9eb5aa"/></marker><marker id="flow-arrow-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2b9874"/></marker></defs><rect x="220" y="38" width="445" height="152" rx="18" fill="#f0f5fb"/><rect x="220" y="246" width="445" height="152" rx="18" fill="#f5f1f8"/><text x="235" y="32" class="branch-title">ВЕТКА 1 · КОЛИЧЕСТВО И БЮДЖЕТ</text><text x="235" y="242" class="branch-title">ВЕТКА 2 · МАКЕТ И ПРОВЕРКА</text><text x="730" y="420" class="branch-title">ИСПОЛНЕНИЕ И ВЫДАЧА ←</text>`;
    for (const [from,to,path,label,x,y] of links) {
      const done = sent.some(e=>e.data?.from===from&&e.data?.to===to);
      const active = s.running && last?.data?.from===from;
      const id=`edge-${from}-${to}`;
      svg+=`<path id="${id}" d="${path}" class="flow-edge ${done?'sent':''}" marker-end="url(#flow-arrow${done?'-done':''})"/><rect x="${x-label.length*3.6-6}" y="${y-12}" width="${label.length*7.2+12}" height="19" rx="5" fill="#f8faf8"/><text x="${x}" y="${y+1}" class="edge-label">${h(label)}</text>`;
      if(active)svg+=`<circle r="5" fill="#26a278"><animateMotion dur="1.3s" repeatCount="indefinite" path="${path}"/></circle>`;
    }
    for(const a of s.agents){
      const [x,y]=points[a.id];
      const human=window.avatar(a).replace('<svg viewBox=', '<svg x="-31" y="-62" width="62" height="58" viewBox=');
      svg+=`<g class="flow-node agent ${a.status}" data-agent="${a.id}" tabindex="0" role="button" aria-label="Стол ${a.id}: ${h(a.name)}, ${status[a.status]}" transform="translate(${x},${y})"><rect class="node-card" x="-90" y="-68" width="180" height="136" rx="12"/><text class="node-number" x="-76" y="-48">${String(a.id).padStart(2,'0')}</text>${human}<text class="node-name" y="8">${h(names[a.id])}</text><text class="node-summary" y="27">${h(summary(a,s.order))}</text><rect class="state-pill" x="-80" y="39" width="160" height="21" rx="5"/><text class="node-status" y="53">${h(status[a.status])}</text></g>`;
    }
    svg+=`<g transform="translate(290,515)"><rect x="-94" y="-55" width="188" height="110" rx="14" fill="${s.complete?'#e3f4e8':'#f0f4f1'}" stroke="#c6ddcd"/><text y="-17" class="finish-icon">${s.complete?'✓':'✧'}</text><text y="10" class="node-name">Готово к вручению</text><text y="32" class="node-summary">100 подарков + резерв</text></g><text x="25" y="618" class="branch-title">Нажмите на человечка — откроются инструкция и результат. Зелёная стрелка = результат передан.</text></svg>`;
    $('#process-map').innerHTML=svg;
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
    $('#now-doing').innerHTML=`<span class="live-dot"></span><div><b>${s.complete?'Заказ выполнен':!s.started?'Начните с полного автопрогона':!s.running?'Эмуляция на паузе':gate?'Решение ведущего':active.length?active.map(a=>names[a.id]).join(' + '):'Передача задач'}</b><span>${s.complete?`100 подарков по столам. Резерв: ${s.order.reserve} шт.`:!s.started?'Наблюдайте за стрелками и читайте сообщения под схемой.':gate?(s.config.auto_approve?'Демо-ведущий согласует заказ автоматически, если смета в лимите.':'Нажмите «Согласовать» под схемой.'):active.length?active.map(a=>a.task).join(' · '):'Все результаты и сообщения сохраняются в журнале.'}</span></div>`;
    const last=s.events.filter(e=>e.kind==='transfer').at(-1);
    $('#handoff-live').innerHTML=last?`<span class="handoff-icon">↗</span><div><b>${h(names[last.data.from])} → ${h(names[last.data.to])}</b><p>${h(last.text)}</p></div>`:'<span class="handoff-icon">↗</span><div><b>Здесь появится последняя передача</b><p>Например: партнёры → финансы: «Тираж 110 шт., рассчитай стоимость».</p></div>';
    const messages=s.events.filter(e=>['transfer','dialogue','human','ingress'].includes(e.kind));
    $('#conversation-preview').innerHTML=messages.slice(-3).map(e=>conversation(e,s)).join('')||'<div class="empty">Запустите автопрогон — здесь появится переписка с конкретными результатами.</div>';
    const filter=$('#conversation-filter');
    if(filter.options.length===1)filter.innerHTML+=[0,...s.agents.map(a=>a.id)].map(n=>`<option value="${n}">${h(names[n])}</option>`).join('');
    const value=filter.value;
    $('#conversation-list').innerHTML=messages.filter(e=>value==='all'||e.table===Number(value)||e.data?.to===Number(value)).map(e=>conversation(e,s)).join('')||'<div class="empty">Пока нет сообщений. Запустите игру или выберите другой стол.</div>';
    document.querySelectorAll('[data-speed]').forEach(el=>el.classList.toggle('active',Number(el.dataset.speed)===s.config.speed));
    $('#flow-pause').disabled=!s.started||s.complete;
    $('#flow-pause').textContent=s.running?'Ⅱ Пауза':'▶ Продолжить';
    $('#quick-demo').textContent=s.complete?'↺ Повторить автопрогон':s.started?'↺ Новый автопрогон':'▶ Полный автопрогон';
  }
  return {render};
})();

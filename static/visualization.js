/* Process map and transcript consume the same events as the game engine. */
window.GameVisuals = (() => {
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = s => document.querySelector(s);
  const names = ['Ведущий / участник','Гендиректор','Партнёры','Финансы','Дизайн','Бренд-контроль','Закупки','Производитель','Логистика','Приёмка','Выдача'];
  const status = {waiting:'Ожидает входящие данные',ready:'Ваш ход',working:'Работает',approval:'Ждёт решения ведущего',done:'Результат передан'};
  const points={1:[130,245],2:[375,125],3:[620,125],4:[375,365],5:[620,365],6:[865,245],7:[1110,245],8:[1110,565],9:[865,565],10:[620,565],0:[375,565]};
  const links=[[1,2,''],[1,4,''],[2,3,'Тираж'],[2,6,'Реестр получателей'],[3,6,'Смета'],[4,5,'Макет'],[5,6,'Бренд'],[6,7,'Заказ'],[7,8,'Доставка'],[8,9,'Партия'],[9,10,'Акт'],[10,0,'Выдача']];
  const board={width:1240,height:850},halfWidth=96,cardTop=-39;
  let routePaths=new Map();
  function rounded(points,radius=12){
    let d=`M${points[0][0]} ${points[0][1]}`;
    for(let i=1;i<points.length-1;i++){
      const p=points[i-1],c=points[i],n=points[i+1],before=Math.hypot(c[0]-p[0],c[1]-p[1]),after=Math.hypot(n[0]-c[0],n[1]-c[1]);
      const r=Math.min(radius,before/2,after/2);
      d+=` L${c[0]+(p[0]-c[0])*r/before} ${c[1]+(p[1]-c[1])*r/before} Q${c[0]} ${c[1]} ${c[0]+(n[0]-c[0])*r/after} ${c[1]+(n[1]-c[1])*r/after}`;
    }
    return d+` L${points.at(-1)[0]} ${points.at(-1)[1]}`;
  }
  function route(from,to,expanded){
    const [ax,ay]=points[from],[bx,by]=points[to];let vertices,label;
    if(from===1){const offset=to===2?-14:14;vertices=[[ax+halfWidth,ay+offset],[252,ay+offset],[252,by],[bx-halfWidth,by]];label=[252,by-20]}
    else if(from===2&&to===6){vertices=[[ax,ay+cardTop],[ax,36],[bx,36],[bx,by+cardTop]];label=[760,23]}
    else if((from===3||from===5)&&to===6){const offset=from===3?-14:14;vertices=[[ax+halfWidth,ay],[742,ay],[742,by+offset],[bx-halfWidth,by+offset]];label=[742,from===3?194:324]}
    else if(from===7){const bottom=expanded.has(from)?145:39;vertices=[[ax,ay+bottom],[bx,by+cardTop]];label=[1170,(ay+bottom+by+cardTop)/2]}
    else{const direction=bx>ax?1:-1;vertices=[[ax+halfWidth*direction,ay],[bx-halfWidth*direction,by]];label=[(ax+bx)/2,ay-53]}
    return {path:rounded(vertices),vertices,label};
  }
  function packet(e,s){return `<rect x="-180" y="-32" width="360" height="68" rx="12"/><text y="-10">${h(names[e.data.from])} → ${h(e.data.to===0?'Команда':names[e.data.to])}</text><text class="packet-text" y="13">${h(brief(e,s))}</text><text class="packet-caption" y="28">Передача результата</text>`}
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
    const route=routePaths.get(`${e.data.from}-${e.data.to}`);
    if(!layer||!route)return;
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',route.path);
    path.setAttribute('fill','none');path.setAttribute('stroke','none');layer.appendChild(path);
    const person=document.createElementNS(ns,'g');person.setAttribute('class','running-agent');person.setAttribute('aria-label',`${names[e.data.from]} передаёт информацию: ${e.text}`);
    const c=['#607aa8','#6e9e88','#ae9765','#a58bb4','#6c9d9c','#7b8da4','#c29a6a','#6c9eaf','#859f79','#b98c94'][e.data.from-1];
    person.innerHTML=`<ellipse cx="0" cy="26" rx="22" ry="6" fill="#45674a28"/><g class="runner-body"><path class="run-leg left-leg" d="M-5 7L-13 23" stroke="#475d51" stroke-width="7" stroke-linecap="round"/><path class="run-leg right-leg" d="M5 7L14 23" stroke="#475d51" stroke-width="7" stroke-linecap="round"/><path d="M-15 5Q-15-20 0-20Q15-20 15 5Z" fill="${c}"/><circle cy="-31" r="11" fill="#f1cfaf"/><path d="M-11-32Q-12-46 0-45Q12-45 11-31L6-38Q0-34-8-38Z" fill="#595147"/><circle cx="-4" cy="-31" r="1.1"/><circle cx="4" cy="-31" r="1.1"/><path class="run-arm" d="M-12-12L-23-2M12-12L24-20" stroke="${c}" stroke-width="7" stroke-linecap="round"/><rect x="17" y="-34" width="20" height="26" rx="3" fill="#fff" stroke="#5c967a" stroke-width="1.5"/><path d="M21-26H32M21-21H32M21-16H29" stroke="#86ad96" stroke-width="1.5"/></g>`;
    const bubble=document.createElementNS(ns,'g');bubble.setAttribute('class','moving-message');bubble.style.display='none';
    bubble.innerHTML=packet(e,s);
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
      if(slot>=0)m.bubble.setAttribute('transform',`translate(${[220,620,1020][slot]},800)`);
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
    const sent=s.events.filter(e=>e.kind==='transfer');
    if(activeGame!==s.id){activeGame=s.id;seen=new Set(s.events.map(e=>e.id));movers=[];if($('#motion-layer'))$('#motion-layer').innerHTML=''}
    const involved=new Set(s.agents.filter(a=>['working','approval'].includes(a.status)).map(a=>a.id));
    for(const m of movers){involved.add(m.event.data.from);involved.add(m.event.data.to)}
    for(const e of sent)if(!seen.has(e.id)){involved.add(e.data.from);involved.add(e.data.to)}
    const lane=(ids,y,title)=>{const height=ids.some(id=>involved.has(id))?208:102;return `<g class="map-lane"><rect x="263" y="${y}" width="469" height="${height}" rx="17"/><text x="280" y="${y-15}" class="map-stage-heading">${title}</text></g>`};
    let svg=`<svg class="process-svg" viewBox="0 0 ${board.width} ${board.height}" role="group" aria-label="Путь поручения между десятью помощниками"><defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#bbcddd" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker><marker id="flow-arrow-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#7aa9d4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>${lane([2,3],74,'КОЛИЧЕСТВО И БЮДЖЕТ')}${lane([4,5],314,'МАКЕТ И ПРОВЕРКА')}<text x="34" y="191" class="map-stage-heading">ПОРУЧЕНИЕ</text><text x="769" y="191" class="map-stage-heading">ЗАКАЗ И ПРОИЗВОДСТВО</text><text x="769" y="496" class="map-stage-heading">ДОСТАВКА, ПРИЁМКА И ВЫДАЧА</text>`;
    routePaths=new Map();
    for(const [from,to,label] of links){
      const r=route(from,to,involved),key=`${from}-${to}`;routePaths.set(key,r);
      const done=sent.some(e=>e.data?.from===from&&e.data?.to===to);
      svg+=`<path id="edge-${key}" d="${r.path}" data-from="${from}" data-to="${to}" class="flow-edge ${done?'sent':''}" marker-end="url(#flow-arrow${done?'-done':''})"/>`;
      if(label){const [x,y]=r.label,width=label.length*6+16;svg+=`<g class="map-edge-label"><rect x="${x-width/2}" y="${y-12}" width="${width}" height="22" rx="7"/><text x="${x}" y="${y+2}" class="edge-label">${h(label)}</text></g>`}
    }
    const compactStatus={waiting:'Ожидает',ready:'Ваш ход',working:'Работает',approval:'Нужно решение',done:'Готово'};
    for(const a of s.agents){
      const [x,y]=points[a.id],expanded=involved.has(a.id);
      const human=window.avatar(a).replace('<svg viewBox=','<svg x="-84" y="-29" width="53" height="56" viewBox=');
      const outgoing=[...sent].reverse().find(e=>e.data.from===a.id);
      const note=a.status==='approval'?['Решение команды','Капитан проверяет рекомендацию и согласует закупку.']:a.status==='working'?actions[a.id]:['Передаю результат',outgoing?brief(outgoing,s):'Готовлю данные для следующего шага.'];
      svg+=`<g class="flow-node agent ${a.status} ${expanded?'expanded':'collapsed'}" data-agent="${a.id}" tabindex="0" role="button" aria-label="Стол ${a.id}: ${h(a.name)}, ${status[a.status]}" transform="translate(${x},${y})"><rect class="node-card" x="-96" y="-39" width="192" height="${expanded?184:78}" rx="14"/>${human}<text class="node-number" x="78" y="-22">${String(a.id).padStart(2,'0')}</text><text class="node-name" x="-21" y="-4">${h(names[a.id])}</text><text class="node-status" x="-21" y="17">${h(compactStatus[a.status])}</text>${expanded?`<path class="map-card-divider" d="M-80 36H80"/><text class="node-summary" y="54">${h(summary(a,s.order))}</text><foreignObject x="-84" y="65" width="168" height="67"><div xmlns="http://www.w3.org/1999/xhtml" class="map-explanation"><b>${h(note[0])}</b><span>${h(note[1])}</span></div></foreignObject>`:''}</g>`;
    }
    svg+=`<g class="map-finish ${s.complete?'complete':''}" transform="translate(375,565)"><rect class="node-card" x="-96" y="-39" width="192" height="78" rx="14"/><circle cx="-69" cy="0" r="15"/><text class="finish-icon" x="-69" y="6">${s.complete?'✓':'◇'}</text><text x="-43" y="-5" class="finish-title">Подарки готовы</text><text x="-43" y="16" class="finish-detail">${s.complete?'100 гостям · резерв '+s.order.reserve:'Результат команды'}</text></g><path class="map-dock-divider" d="M34 734H1206"/><text x="40" y="754" class="map-stage-heading">ОБМЕН РЕЗУЛЬТАТАМИ</text>`;
    const hasMotion=movers.length>0||sent.some(e=>!seen.has(e.id));
    if(!hasMotion)svg+=sent.filter(e=>e.data.to!==0).slice(-3).map((e,i)=>`<g class="moving-message recent-map-message" transform="translate(${[220,620,1020][i]},800)">${packet(e,s)}</g>`).join('');
    svg+='</svg>';
    if(!$('#map-base'))$('#process-map').innerHTML=`<div id="map-base"></div><svg id="motion-layer" class="motion-layer" viewBox="0 0 ${board.width} ${board.height}" aria-hidden="true"></svg>`;
    $('#map-base').innerHTML=svg;snapshot=s;
    for(const m of movers){const r=routePaths.get(`${m.event.data.from}-${m.event.data.to}`);if(r){m.path.setAttribute('d',r.path);m.length=m.path.getTotalLength()}}
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

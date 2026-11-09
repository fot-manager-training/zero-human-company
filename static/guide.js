/* Explanatory views adapted to this game's ten roles and event contracts. */
window.HowItWorks = (() => {
  const h=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const version=new URL(document.currentScript.src).searchParams.get('v');
  const asset=file=>'./'+file+(version?'?v='+encodeURIComponent(version):'');
  const roles=[
    ['01','Гендиректор','Поручение команды','Структурированный заказ и две задачи'],
    ['02','Партнёры','Список получателей','Тираж без дублей и резерв'],
    ['03','Финансы','Тираж и прайс','Полная смета и сравнение с лимитом'],
    ['04','Дизайн','Бриф и выбранный макет','Цвет, логотип и версия'],
    ['05','Бренд-контроль','Версия макета','Проверка логотипа и читаемости'],
    ['06','Закупки','Тираж, смета, одобренный макет','Единый заказ после решения капитана'],
    ['07','Производство','Согласованный заказ','Партия, коробки и дата отгрузки'],
    ['08','Логистика','Данные партии и адрес','Прибытие на площадку'],
    ['09','Приёмка','Заказ и акт','Принятое количество и расхождения'],
    ['10','Выдача','Остаток и рассадка','Распределение по столам и запас']
  ];
  const examples={
    partners:{title:'Стол 02 · Партнёры',input:'108 записей партнёров, правило резерва 10%.',action:'Помощник исключает 8 повторов и считает уникальных получателей.',output:'100 партнёров + 10 в резерв = 110 подарков.',human:'Команда выбирает правило резерва и проверяет расчёт.',next:'Финансы получают тираж; закупки — данные о количестве.'},
    finance:{title:'Стол 03 · Финансы',input:'Тираж 110 шт.; шар 420 ₽, упаковка 80 ₽, доставка 5 000 ₽.',action:'Помощник считает общую стоимость и сверяет её с лимитом 80 000 ₽.',output:'110 × (420 + 80) + 5 000 = 60 000 ₽.',human:'Участник уточняет состав сметы. Решение о размещении заказа принимает капитан.',next:'Смета поступает закупкам вместе с тиражом и макетом.'},
    purchase:{title:'Стол 06 · Закупки',input:'110 подарков, смета 60 000 ₽, одобренный макет v1.0.',action:'Помощник объединяет результаты трёх ролей в одну карточку заказа.',output:'Номер заказа, количество, сумма, версия макета, адрес и срок.',human:'Капитан проверяет рекомендацию и согласует закупку. До решения производство ждёт.',next:'После согласования производитель получает готовый заказ.'}
  };
  const states={
    waiting:['Ожидает','Входные данные ещё не готовы. Карточка остаётся компактной, помощник не начинает расчёт.','◌'],
    ready:['Ваш ход','Предыдущие роли передали необходимые результаты. Команда может написать поручение своему помощнику.','→'],
    working:['Работает','Помощник считает, сверяет или готовит документ. На карте раскрываются действие и краткое пояснение.','✦'],
    approval:['Нужно решение','Закупки подготовили рекомендацию. Капитан принимает решение, которое разрешает следующий этап.','?'],
    done:['Результат готов','Структурированный результат сохранён. Следующая роль получает именно эти данные, а не пересказывает их заново.','✓'],
    transfer:['Доставка данных','Персонаж несёт сообщение коллеге. После передачи участники общения снова сворачиваются.','↗']
  };
  function figure(file,alt,first=false){return `<figure class="guide-figure"><div class="guide-diagram-scroll"><img class="guide-image ${first?'architecture-image':''}" src="${asset(file)}" alt="${h(alt)}"></div><figcaption><span>Векторная схема · можно открыть в полном размере</span><a href="${asset(file)}" download="${first?'business-game-architecture.svg':file}">Скачать SVG ↗</a></figcaption></figure>`}
  function example(key){const e=examples[key];document.querySelector('#guide-example').innerHTML=`<div class="guide-example-title">${h(e.title)}</div><div class="guide-example-grid">${[['Вход',e.input],['Действие ИИ',e.action],['Результат',e.output],['Роль человека',e.human]].map(([a,b])=>`<div><span>${a}</span><p>${h(b)}</p></div>`).join('')}</div><div class="guide-example-next">↗ ${h(e.next)}</div>`;document.querySelectorAll('[data-guide-example]').forEach(b=>b.classList.toggle('active',b.dataset.guideExample===key))}
  function state(key){const [name,description,icon]=states[key];document.querySelector('#guide-state-detail').innerHTML=`<div class="guide-state-icon ${key}">${icon}</div><div><h3>${name}</h3><p>${description}</p></div>`;document.querySelectorAll('[data-guide-state]').forEach(b=>b.classList.toggle('active',b.dataset.guideState===key))}
  function mount(){
    document.querySelector('#architecture-view').innerHTML=`<nav class="guide-nav" aria-label="Разделы объяснения"><a href="#guide-stand" data-guide-jump="guide-stand"><span>01</span> Стенд</a><a href="#guide-process" data-guide-jump="guide-process"><span>02</span> Процесс</a><a href="#guide-request" data-guide-jump="guide-request"><span>03</span> Одно поручение</a><a href="#guide-states" data-guide-jump="guide-states"><span>04</span> Состояния</a></nav>
    <section id="guide-stand" class="guide-section"><div class="guide-section-heading"><span>01 /</span><h2>Из чего состоит <em>стенд</em></h2></div><p class="guide-lead">Команды пишут поручения в GigaCoWork. Движок связывает роли, хранит результаты и отправляет события на большой экран.</p>${figure('architecture.svg','Команды, рабочие пространства GigaCoWork, адаптер, API, оркестратор, проверка результатов и экран',true)}<div class="guide-principles"><article><span>ЧЕЛОВЕК</span><h3>Задаёт направление</h3><p>Формулирует поручение, проверяет ответ и принимает решение о закупке.</p></article><article><span>ИИ-ПОМОЩНИК</span><h3>Готовит результат</h3><p>Использует контекст своего стола, считает и передаёт данные коллегам.</p></article><article><span>ИГРОВОЙ ДВИЖОК</span><h3>Связывает работу</h3><p>Соблюдает зависимости, фиксирует документы и обновляет состояние сцены.</p></article></div></section>
    <section id="guide-process" class="guide-section"><div class="guide-section-heading"><span>02 /</span><h2>BPMN-цепочка <em>игры</em></h2></div><p class="guide-lead">После поручения подготовка идёт по двум веткам. Закупки объединяют тираж, смету и макет. Производство начинается после решения капитана.</p>${figure('process.svg','Процесс десяти столов: две параллельные ветки, объединение, решение капитана, производство и выдача')}<div class="guide-legend"><div><b>＋</b><span>Разделение и объединение параллельных задач</span></div><div><b>×</b><span>Решение, которое остаётся за человеком</span></div><div><b>→</b><span>Результат одной роли становится входом другой</span></div></div><details class="guide-details"><summary>Что получает и передаёт каждый из десяти столов <span>＋</span></summary><div class="guide-table-scroll"><table class="guide-role-table"><thead><tr><th>Стол</th><th>Роль</th><th>Вход</th><th>Результат</th></tr></thead><tbody>${roles.map(r=>'<tr>'+r.map(v=>`<td>${h(v)}</td>`).join('')+'</tr>').join('')}</tbody></table></div></details></section>
    <section id="guide-request" class="guide-section"><div class="guide-section-heading"><span>03 /</span><h2>Одно поручение.<br><em>Весь путь результата.</em></h2></div><p class="guide-lead">На примере финансов видно, что делает команда, что берёт на себя помощник и какие события получает экран.</p><div class="guide-example-tabs" role="group" aria-label="Пример роли"><button data-guide-example="partners">02 · Партнёры</button><button data-guide-example="finance">03 · Финансы</button><button data-guide-example="purchase">06 · Закупки</button></div><div id="guide-example" class="guide-example"></div>${figure('request.svg','Последовательность одного поручения: команда, помощник, движок, проверка и большой экран')}<details class="guide-details"><summary>Какие данные связывают блоки <span>＋</span></summary><div class="guide-contract-grid"><article><b>Поручение</b><p>Текст, роль стола и уникальный ID запроса. Повторная доставка не создаёт вторую задачу.</p></article><article><b>Результат</b><p>Поля заказа, расчёт, версия макета или статус партии — в структурированном виде.</p></article><article><b>Событие экрана</b><p>Начало работы, готовый результат и передача данных запускают соответствующее действие персонажа.</p></article><article><b>Согласование</b><p>Решение капитана фиксируется отдельно. Без него закупка не переходит к производству.</p></article></div></details></section>
    <section id="guide-states" class="guide-section"><div class="guide-section-heading"><span>04 /</span><h2>Что происходит<br><em>с помощником на экране</em></h2></div><p class="guide-lead">Состояние связано с ходом задачи. Карточки раскрываются во время работы и общения, а сообщения занимают отдельную полосу.</p>${figure('states.svg','Ожидание, доступная задача, работа, результат, доставка данных и решение человека')}<div class="guide-state-tabs" role="group" aria-label="Состояния помощника">${Object.entries(states).map(([key,v])=>`<button data-guide-state="${key}">${v[0]}</button>`).join('')}</div><div id="guide-state-detail" class="guide-state-detail" aria-live="polite"></div></section>`;
    example('finance');state('waiting');
  }
  document.addEventListener('click',e=>{
    const jump=e.target.closest('[data-guide-jump]');if(jump){e.preventDefault();document.getElementById(jump.dataset.guideJump).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
    const ex=e.target.closest('[data-guide-example]');if(ex)example(ex.dataset.guideExample);
    const st=e.target.closest('[data-guide-state]');if(st)state(st.dataset.guideState);
  });
  return {mount};
})();
window.HowItWorks.mount();

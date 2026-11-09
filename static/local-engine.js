// Loaded only in the GitHub Pages build. The server version uses the HTTP API.
(() => {
  const data = window.ZH_DEMO_DATA;
  const key = 'zh-company-browser-demo-v3';
  const copy = value => JSON.parse(JSON.stringify(value));
  const fresh = () => ({ ...copy(data.template), id: crypto.randomUUID().slice(0, 8) });
  let game;
  try { game = JSON.parse(localStorage.getItem(key)); } catch {}
  if (!game || !game.agents || game.agents.length !== 10) game = fresh();
  // Resume explicitly after reloading, matching the server's restart semantics.
  game.running = false;
  const deps = [[], [1], [2], [1], [4], [2, 3, 5], [6], [7], [8], [9]];
  const ready = id => deps[id - 1].every(n => game.agents[n - 1].status === 'done');
  const save = () => {
    game.revision++;
    try { localStorage.setItem(key, JSON.stringify(game)); } catch {}
  };
  const event = (kind, text, table = null, result = null) => game.events.push({ id: game.events.length + 1, time: Date.now() / 1000, kind, text, table, data: result });
  const ensure = (condition, text) => { if (!condition) throw Error(text); };
  function message(payload) {
    const id = payload.table_id, text = payload.text;
    ensure(Number.isInteger(id) && id >= 1 && id <= 10, 'Выберите стол от 1 до 10');
    ensure(typeof text === 'string' && text.trim() && text.length <= 4000, 'Введите сообщение до 4000 символов');
    if (payload.request_id && game.receipts[payload.request_id]) return game.receipts[payload.request_id];
    ensure(!game.complete, 'Игра завершена. Создайте новую игру.');
    const agent = game.agents[id - 1];
    if (!game.started) {
      ensure(id === 1, 'Сначала отправьте поручение со стола 1');
      game.started = true; game.running = true;
      game.order = { brief: text.trim(), gift: 'Новогодний шар с логотипом', deadline: '10 декабря 2026', address: 'Демо-площадка акселератора, зал «Орбита»' };
      event('system', 'Заказ принят. Гендиректор запускает компанию.', 1);
    } else ensure(agent.status !== 'done' && ready(id), 'Стол ожидает входящие данные или уже завершил работу');
    agent.requested = true;
    game.messages.push({ table: id, text: text.trim(), time: Date.now() / 1000, source: 'terminal' });
    event('message', text.trim(), id);
    event('ingress', 'Участник → чат GigaCoWork (эмуляция) → API → оркестратор: поручение принято.', id, {from: 0, to: id});
    const response = { accepted: true, game_id: game.id, table_id: id };
    if (payload.request_id) game.receipts[payload.request_id] = response;
    save(); return response;
  }
  function output(id) {
    const variant = data.variants[String(game.config.reserve) + game.config.design];
    const result = copy(variant.outputs[id - 1]);
    const order = copy(variant.orders[id - 1]);
    game.order = { ...game.order, ...order, brief: game.order.brief };
    if (id >= 6) game.order.number = 'ZH-' + game.id.toUpperCase();
    if (id === 3) { result['Лимит, ₽'] = game.config.budget; result['В лимите'] = game.order.total <= game.config.budget; }
    if (id === 6) result['Заказ'] = game.order.number;
    return result;
  }
  function tick() {
    if (!game.running || game.complete) return;
    const now = Date.now() / 1000;
    let changed = false;
    for (const a of game.agents) {
      if (a.status === 'working' && a.due <= now) {
        a.output = output(a.id); a.status = 'done';
        event('result', 'Результат готов: ' + a.task.toLowerCase(), a.id, a.output);
        const variant = data.variants[String(game.config.reserve) + game.config.design];
        for (const original of variant.conversations[a.id - 1]) {
          const transfer = copy(original);
          transfer.text = transfer.text.replace(/ZH-[A-Z0-9]+/g, 'ZH-' + game.id.toUpperCase());
          event('transfer', transfer.text, a.id, transfer);
        }
        changed = true;
      }
    }
    for (const a of game.agents) {
      if (['waiting', 'ready'].includes(a.status) && ready(a.id)) {
        if (a.status === 'waiting') { a.status = 'ready'; changed = true; }
        if (game.auto || a.requested) {
          if (a.id === 6 && !game.approval) {
            a.status = 'approval'; game.approval_due = now + 3 / game.config.speed;
            event('human', 'Закупки → ведущему: тираж, смета и макет готовы. Разрешаете разместить заказ?', 6);
          } else {
            a.status = 'working'; a.due = now + 3 / game.config.speed;
            event('agent', 'Агент работает: ' + a.task.toLowerCase(), a.id);
            event('dialogue', data.work_notes[a.id], a.id);
          }
          changed = true;
        }
      }
    }
    if (game.agents[5].status === 'approval' && game.config.auto_approve && now >= game.approval_due && game.order.total <= game.config.budget) {
      approve(true); changed = true;
    }
    if (game.agents.every(a => a.status === 'done')) {
      game.complete = true; game.running = false;
      event('complete', 'Готово к вручению! 100 подарков распределены по 10 столам, резерв сохранён.');
    }
    if (changed) save();
  }
  function approve(synthetic = false) {
    ensure(game.agents[5].status === 'approval', 'Согласование пока не требуется');
    ensure(game.order.total <= game.config.budget, 'Смета превышает лимит. Создайте новую игру.');
    event('dialogue', data.work_notes[6], 6);
    game.approval = true; game.agents[5].status = 'working'; game.agents[5].due = Date.now() / 1000 + 3 / game.config.speed;
    event('human', (synthetic ? 'Демо-ведущий автоматически согласовал закупку.' : 'Ведущий согласовал закупку.') + ' Заказ передан поставщику.', 6, {synthetic});
  }
  window.gameTransport = async (path, options = {}) => {
    try {
      const p = options.body ? JSON.parse(options.body) : {};
      let result;
      if (path === '/api/state') result = copy(game);
      else if (path === '/api/config') {
        ensure(!game.started || Object.keys(p).every(k => ['speed', 'auto_approve'].includes(k)), 'Параметры заказа зафиксированы. Скорость можно менять.');
        const valid = { reserve: [5, 10].includes(p.reserve), budget: Number.isInteger(p.budget) && p.budget >= 10000 && p.budget <= 1000000, design: ['A', 'B', 'C'].includes(p.design), speed: [1, 2, 4, 8, 16].includes(p.speed), auto_approve: typeof p.auto_approve === 'boolean' };
        for (const k of Object.keys(p)) ensure(valid[k], 'Некорректный параметр: ' + k);
        const anchor = game.paused_at || Date.now() / 1000;
        const ratio = game.config.speed / (p.speed || game.config.speed);
        for (const a of game.agents) if (a.due !== undefined) a.due = anchor + Math.max(0, a.due - anchor) * ratio;
        if (game.approval_due !== undefined) game.approval_due = anchor + Math.max(0, game.approval_due - anchor) * ratio;
        Object.assign(game.config, p); save();
      } else if (path === '/api/messages') result = message(p);
      else if (path === '/api/action') {
        if (p.action === 'reset') game = fresh();
        else if (p.action === 'start') {
          ensure(!game.started, 'Заказ уже запущен'); game.auto = p.auto !== false;
          result = message({ table_id: 1, text: data.brief });
        } else if (p.action === 'set-mode') {
          ensure(!game.started, 'Режим уже зафиксирован'); game.auto = p.auto !== false;
        } else if (p.action === 'pause') { if (game.running) game.paused_at = Date.now() / 1000; game.running = false; }
        else if (p.action === 'resume') {
          ensure(game.started && !game.complete, 'Нет активного заказа');
          if (game.paused_at) {
            const elapsed = Date.now() / 1000 - game.paused_at;
            for (const a of game.agents) if (a.due !== undefined) a.due += elapsed;
            if (game.approval_due !== undefined) game.approval_due += elapsed;
            delete game.paused_at;
          }
          game.running = true;
        } else if (p.action === 'approve') {
          approve(!!p.synthetic);
        } else throw Error('Неизвестное действие');
        save();
      } else throw Error('В браузерном демо этот API недоступен');
      return { ok: true, json: async () => result || { ok: true } };
    } catch (error) { return { ok: false, json: async () => ({ error: error.message }) }; }
  };
  save();
  setInterval(tick, 250);
})();

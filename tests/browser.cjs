// Destructive smoke test: use a dedicated demo server and database.
const { chromium } = require('playwright');
const standalone = process.env.GAME_TEST_MODE === 'browser';
const base = process.env.GAME_TEST_URL || 'http://127.0.0.1:8001';
async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const reset = async () => {
      if (standalone) {
        await page.goto(base);
        await page.waitForSelector('.agent');
      }
      const response = standalone
        ? await page.evaluate(async () => { const r = await window.gameTransport('/api/action', {body: JSON.stringify({action: 'reset'})}); return {ok: r.ok}; })
        : await page.request.post(base + '/api/action', { data: { action: 'reset' } });
      if (!(standalone ? response.ok : response.ok())) throw Error('Reset failed');
      await page.goto(base);
      await page.waitForSelector('.agent');
    };
    await reset();
    await page.screenshot({ path: '/tmp/zh-initial.png', fullPage: true });
    await page.selectOption('#speed', '4');
    await page.click('#play');
    await page.waitForSelector('#approve', { timeout: 20000 });
    await page.screenshot({ path: '/tmp/zh-approval.png', fullPage: true });
    await page.click('#approve');
    await page.waitForFunction(() => document.querySelector('#game-status').textContent === 'Готово к вручению', { timeout: 20000 });
    await page.locator('[data-agent="10"]').click();
    await page.waitForSelector('.result-table');
    if (!(await page.locator('#agent-detail').innerText()).includes('К выдаче')) throw Error('Missing result');
    await page.screenshot({ path: '/tmp/zh-result.png', fullPage: true });
    await page.click('.dialog-close');
    await page.click('.tab[data-view="journal"]');
    if (await page.locator('.journal-row').count() < 20) throw Error('Missing events');
    await page.click('.tab[data-view="tables"]');
    await page.locator('[data-table="3"]').click();
    if (await page.locator('#table-select').inputValue() !== '3') throw Error('Wrong terminal');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('.tab[data-view="company"]');
    await page.screenshot({ path: '/tmp/zh-mobile.png', fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile overflow');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await reset();
    await page.selectOption('#speed', '4');
    await page.check('#manual');
    await page.fill('#message', 'Подготовить подарки партнёрам к 10 декабря');
    await page.click('#send');
    for (const id of [2, 4, 3, 5, 6, 7, 8, 9, 10]) {
      await page.waitForFunction(id => document.querySelector(`[data-agent="${id}"]`).classList.contains('ready'), id, { timeout: 15000 });
      await page.selectOption('#table-select', String(id));
      await page.fill('#message', 'Выполнить задачу по демо-брифу');
      await page.click('#send');
      if (id === 6) {
        await page.waitForSelector('#approve');
        await page.click('#approve');
      }
    }
    await page.waitForFunction(() => document.querySelector('#game-status').textContent === 'Готово к вручению');
    const state = standalone
      ? await page.evaluate(async () => (await window.gameTransport('/api/state')).json())
      : await (await page.request.get(base + '/api/state')).json();
    if (state.auto || state.messages.length !== 10 || state.order.distributed !== 100) throw Error('Manual chain failed');
    if (errors.length) throw Error(errors.join('\n'));
    console.log('PASS: auto and manual chains, human approval, results, journal, terminals, mobile, no browser errors');
  } finally {
    await browser.close();
  }
}
run().catch(e => { console.error(e); process.exit(1); });

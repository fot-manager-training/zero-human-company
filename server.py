"""Synthetic business game. Python 3.12+, no third-party runtime dependencies."""
import argparse
import copy
import json
import math
import os
import sqlite3
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
ROLES = [
    ('Гендиректор', 'Поручение и запуск', 'brief'),
    ('Партнёрский отдел', 'Получатели и тираж', 'partners'),
    ('Финансы', 'Бюджет и стоимость', 'finance'),
    ('Дизайн', 'Макет подарка', 'design'),
    ('Бренд-контроль', 'Проверка макета', 'brand'),
    ('Закупки', 'Заказ поставщику', 'purchase'),
    ('Производитель', 'Выпуск и упаковка', 'production'),
    ('Логистика', 'Доставка на площадку', 'logistics'),
    ('Приёмка', 'Проверка партии', 'acceptance'),
    ('Выдача подарков', 'Распределение по столам', 'gifts'),
]
DEFAULT_BRIEF = 'Подготовить новогодние шары с логотипом для партнёров компании к мероприятию 10 декабря. Количество рассчитать по списку.'
DEPENDENCIES = {1: [], 2: [1], 3: [2], 4: [1], 5: [4], 6: [2, 3, 5], 7: [6], 8: [7], 9: [8], 10: [9]}

class GameError(Exception):
    pass

class Game:
    def __init__(self, db_path):
        self.lock = threading.RLock()
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.execute('CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY, data TEXT NOT NULL)')
        row = self.db.execute('SELECT data FROM snapshot WHERE id=1').fetchone()
        self.state = json.loads(row[0]) if row else self.fresh()
        # Live timers do not survive a restart. Resume explicitly from the UI.
        if row and self.state['running']:
            self.state['running'] = False
            self.event('system', 'Сервер перезапущен. Нажмите «Продолжить», чтобы возобновить цепочку.')
        self.save()

    @staticmethod
    def fresh():
        return {'id': uuid.uuid4().hex[:8], 'revision': 0, 'running': False, 'started': False,
                'complete': False, 'auto': True, 'approval': False, 'config': {'reserve': 10, 'budget': 80000, 'design': 'A', 'speed': 1},
                'order': {}, 'agents': [{'id': i, 'name': r[0], 'task': r[1], 'key': r[2], 'status': 'waiting', 'output': None,
                'instruction': f'Ты — агент роли «{r[0]}». {r[1]}. Используй демо-бриф и передай структурированный результат следующей роли.'}
                for i, r in enumerate(ROLES, 1)], 'events': [], 'messages': [], 'receipts': {}}

    def save(self):
        self.state['revision'] += 1
        self.db.execute('INSERT OR REPLACE INTO snapshot VALUES (1, ?)', (json.dumps(self.state, ensure_ascii=False),))
        self.db.commit()

    def event(self, kind, text, table=None, data=None):
        self.state['events'].append({'id': len(self.state['events']) + 1, 'time': time.time(), 'kind': kind, 'text': text, 'table': table, 'data': data})

    def snapshot(self):
        with self.lock:
            return copy.deepcopy(self.state)

    def configure(self, payload):
        with self.lock:
            if self.state['started']:
                raise GameError('Параметры фиксируются при запуске. Создайте новую игру для изменения.')
            config = dict(self.state['config'])
            for key, value in payload.items():
                if key == 'reserve' and type(value) is int and value in (5, 10): config[key] = value
                elif key == 'budget' and type(value) is int and 10000 <= value <= 1000000: config[key] = value
                elif key == 'design' and value in ('A', 'B', 'C'): config[key] = value
                elif key == 'speed' and type(value) in (int, float) and value in (1, 2, 4): config[key] = value
                else: raise GameError('Некорректный параметр: ' + key)
            self.state['config'] = config
            self.save()

    def ready(self, i):
        return all(self.state['agents'][n-1]['status'] == 'done' for n in DEPENDENCIES[i])

    def message(self, payload):
        with self.lock:
            table = payload.get('table_id')
            text = payload.get('text', '')
            if type(table) is not int or not 1 <= table <= 10: raise GameError('table_id: целое число от 1 до 10')
            if not isinstance(text, str) or not text.strip() or len(text) > 4000: raise GameError('Текст: от 1 до 4000 символов')
            key = payload.get('request_id')
            if key is not None and (not isinstance(key, str) or not 1 <= len(key) <= 100): raise GameError('Некорректный request_id')
            if key and key in self.state['receipts']: return self.state['receipts'][key]
            text = text.strip()
            if not self.state['started'] and table != 1: raise GameError('Сначала запустите поручение со стола 1')
            a = self.state['agents'][table-1]
            if self.state['complete']: raise GameError('Игра завершена. Создайте новую игру.')
            if self.state['started'] and (a['status'] == 'done' or not self.ready(table)): raise GameError('Стол ожидает входящие данные или уже завершил работу')
            if not self.state['started']:
                self.state['started'] = True
                self.state['running'] = True
                self.state['order'] = {'brief': text, 'gift': 'Новогодний шар с логотипом', 'deadline': '10 декабря 2026', 'address': 'Демо-площадка акселератора, зал «Орбита»'}
                self.event('system', 'Заказ принят. Гендиректор запускает компанию.', 1)
            self.state['messages'].append({'table': table, 'text': text, 'time': time.time(), 'source': payload.get('source', 'terminal')})
            a['requested'] = True
            result = {'accepted': True, 'game_id': self.state['id'], 'table_id': table}
            if key: self.state['receipts'][key] = result
            self.event('message', text, table)
            self.save()
            return result

    def action(self, payload):
        with self.lock:
            name = payload.get('action')
            if name == 'reset':
                self.state = self.fresh()
                self.save()
                return
            if name == 'set-mode':
                if self.state['started']: raise GameError('Режим уже зафиксирован')
                self.state['auto'] = payload.get('auto', True) is not False
                self.save()
                return
            if name == 'start':
                if self.state['started']: raise GameError('Заказ уже запущен')
                self.state['auto'] = payload.get('auto', True) is not False
                return self.message({'table_id': 1, 'text': DEFAULT_BRIEF, 'source': 'demo'})
            if name == 'pause': self.state['running'] = False
            elif name == 'resume':
                if not self.state['started'] or self.state['complete']: raise GameError('Нет активного заказа')
                self.state['running'] = True
            elif name == 'approve':
                if self.state['agents'][5]['status'] != 'approval': raise GameError('Согласование пока не требуется')
                if self.state['order']['total'] > self.state['config']['budget']: raise GameError('Смета превышает лимит. Начните новую игру с достаточным бюджетом.')
                self.state['approval'] = True
                self.event('human', 'Ведущий согласовал закупку. Заказ передан поставщику.', 6)
                self.state['agents'][5]['status'] = 'working'
                self.state['agents'][5]['due'] = time.time() + 1
            else: raise GameError('Неизвестное действие')
            self.save()

    def output(self, i):
        o, c = self.state['order'], self.state['config']
        if i == 1:
            return {'Подарок': o['gift'], 'Получатели': 'Партнёры компании · демо-список', 'Срок': o['deadline'], 'Количество': 'Рассчитать по списку', 'Источник пропусков': 'Синтетический демо-бриф'}
        if i == 2:
            # Synthetic list contains 108 records and eight duplicated IDs.
            records = list(range(1, 101)) + list(range(1, 9))
            base = len(set(records)); reserve = math.ceil(base*c['reserve']/100)
            o.update(base=base, reserve=reserve, quantity=base+reserve)
            return {'Записей': len(records), 'Исключено дублей': len(records)-base, 'Получателей': base, 'Резерв': reserve, 'Тираж': o['quantity']}
        if i == 3:
            total = o['quantity'] * (420+80) + 5000
            o.update(total=total, unit_price=round(total/o['quantity'], 2))
            return {'Шар, ₽/шт': 420, 'Упаковка, ₽/шт': 80, 'Доставка, ₽': 5000, 'Всего, ₽': total, 'За единицу, ₽': o['unit_price'], 'Лимит, ₽': c['budget'], 'В лимите': total <= c['budget']}
        if i == 4:
            o.update(design=c['design'], version='v1.0', color={'A':'Изумрудный', 'B':'Синий', 'C':'Бордовый'}[c['design']])
            return {'Макет': c['design'], 'Версия': o['version'], 'Цвет': o['color'], 'Логотип': 'Демо-монограмма ZH · по центру', 'Источник': 'Синтетический бренд-набор'}
        if i == 5:
            o['brand_approved'] = True
            return {'Версия': o['version'], 'Логотип': 'Официальный в демо-наборе', 'Пропорции': 'Сохранены', 'Цвет и читаемость': 'Соответствуют', 'Вердикт': 'Готово к заказу'}
        if i == 6:
            o['number'] = 'ZH-' + self.state['id'].upper()
            return {'Заказ': o['number'], 'Тираж': o['quantity'], 'Сумма, ₽': o['total'], 'Макет': o['version'], 'Адрес': o['address'], 'Согласование': 'Ведущим'}
        if i == 7:
            o['boxes'] = math.ceil(o['quantity']/20)
            return {'Статус': 'Изготовлено и упаковано', 'Тираж': o['quantity'], 'Коробок': o['boxes'], 'Отгрузка': '9 декабря 2026 · 10:00', 'Источник': 'Подготовленное демо-подтверждение'}
        if i == 8:
            return {'Маршрут': 'Производитель → площадка акселератора', 'Адрес': o['address'], 'Коробок': o['boxes'], 'Прибытие': '10 декабря 2026 · 09:00', 'Статус': 'Прибыло', 'Источник': 'Синтетический маршрут'}
        if i == 9:
            o['accepted'] = o['quantity']
            return {'Заказано': o['quantity'], 'Принято': o['accepted'], 'Упаковка': 'Без повреждений', 'Макет': 'Соответствует v1.0', 'Расхождения': 0, 'Источник': 'Эталонный демо-акт'}
        o['distributed'] = o['base']
        return {'По столам': {str(n): 10 for n in range(1, 11)}, 'К выдаче': o['base'], 'Остаток в резерве': o['accepted']-o['base'], 'Статус': 'Готово к вручению'}

    def tick(self, now=None):
        now = time.time() if now is None else now
        with self.lock:
            if not self.state['running'] or self.state['complete']: return
            changed = False
            for a in self.state['agents']:
                if a['status'] == 'working' and a.get('due', float('inf')) <= now:
                    a['output'] = self.output(a['id']); a['status'] = 'done'
                    self.event('result', 'Результат готов: ' + a['task'].lower(), a['id'], a['output'])
                    changed = True
            for a in self.state['agents']:
                if a['status'] in ('waiting', 'ready') and self.ready(a['id']):
                    if a['status'] == 'waiting':
                        a['status'] = 'ready'; changed = True
                    if self.state['auto'] or a.get('requested'):
                        if a['id'] == 6 and not self.state['approval']:
                            a['status'] = 'approval'
                            self.event('human', 'Требуется согласование закупки ведущим.', 6)
                        else:
                            a['status'] = 'working'
                            a['due'] = now + 3 / self.state['config']['speed']
                            self.event('agent', 'Агент работает: ' + a['task'].lower(), a['id'])
                        changed = True
            if all(a['status'] == 'done' for a in self.state['agents']):
                self.state.update(complete=True, running=False)
                self.event('complete', 'Готово к вручению! 100 подарков распределены по 10 столам, резерв сохранён.')
            if changed: self.save()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def respond(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/state': return self.respond(200, self.server.game.snapshot())
        if path == '/api/health': return self.respond(200, {'ok': True, 'mode': 'synthetic'})
        files = {'/': ('index.html','text/html'), '/app.js': ('app.js','text/javascript'), '/style.css': ('style.css','text/css')}
        if path not in files: return self.respond(404, {'error': 'Не найдено'})
        name, mime = files[path]; body = (ROOT/'static'/name).read_bytes()
        self.send_response(200); self.send_header('Content-Type', mime+'; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 20000: return self.respond(413, {'error': 'Некорректный размер запроса'})
            if self.path == '/api/integrations/gigacowork':
                token = os.environ.get('GAME_WEBHOOK_TOKEN')
                if not token: return self.respond(503, {'error': 'Внешний адаптер не включён: задайте GAME_WEBHOOK_TOKEN'})
                import hmac
                if not hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+token): return self.respond(401, {'error': 'Неверный токен'})
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict): raise GameError('Ожидается JSON-объект')
            if self.path in ('/api/messages', '/api/integrations/gigacowork'):
                payload['source'] = 'gigacowork' if 'integrations' in self.path else 'terminal'
                result = self.server.game.message(payload)
            elif self.path == '/api/action': result = self.server.game.action(payload)
            elif self.path == '/api/config': result = self.server.game.configure(payload)
            else: return self.respond(404, {'error': 'Не найдено'})
            self.respond(200, result or {'ok': True})
        except (GameError, ValueError, TypeError) as e: self.respond(400, {'error': str(e)})


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--port', type=int, default=8000); parser.add_argument('--host', default='127.0.0.1'); parser.add_argument('--db', default=str(ROOT/'.local/game.sqlite3')); args = parser.parse_args()
    Path(args.db).parent.mkdir(parents=True, exist_ok=True)
    game = Game(args.db)
    server = ThreadingHTTPServer((args.host, args.port), Handler); server.game = game
    def worker():
        while True:
            game.tick(); time.sleep(.25)
    threading.Thread(target=worker, daemon=True).start()
    print(f'Zero Human Company · http://{args.host}:{args.port}', flush=True)
    server.serve_forever()

if __name__ == '__main__': main()

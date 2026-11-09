"""Build a standalone browser demo, retaining the Python service separately."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from server import Game, DEFAULT_BRIEF
from scenario import transfers, WORK_NOTES


def build(destination):
    destination.mkdir(parents=True, exist_ok=True)
    variants = {}
    for reserve in (5, 10):
        for design in ('A', 'B', 'C'):
            game = Game(':memory:')
            game.configure({'reserve': reserve, 'design': design})
            game.action({'action': 'start'})
            initial = game.snapshot()
            outputs = []
            orders = []
            conversations = []
            for i in range(1, 11):
                before = dict(game.state['order'])
                outputs.append(game.output(i))
                conversations.append(transfers(i, game.state["order"]))
                orders.append({k: v for k, v in game.state['order'].items() if before.get(k) != v})
            variants[str(reserve)+design] = {'outputs': outputs, 'orders': orders, 'conversations': conversations}
            game.db.close()
    template = Game.fresh()
    template['config'].update(speed=2, auto_approve=False)
    data = {'template': template, 'variants': variants, 'brief': DEFAULT_BRIEF, 'work_notes': WORK_NOTES}
    (destination/'demo-data.js').write_text('window.ZH_DEMO_DATA = '+json.dumps(data, ensure_ascii=False)+';\n')
    for name in ('app.js', 'style.css', 'local-engine.js', 'architecture.svg', 'visualization.js', 'cowork.js'):
        shutil.copyfile(ROOT/'static'/name, destination/name)
    html = (ROOT/'static/index.html').read_text()
    html = html.replace('<script src="./app.js">', '<script src="./demo-data.js"></script><script src="./local-engine.js"></script><script src="./app.js">')
    html = html.replace('Сейчас это локальный чат. Внешние сообщения принимаются через API-адаптер GigaCoWork.', 'Учебная сессия сохраняется на этом устройстве. Для общей работы столов нужен сервер; внешний коннектор GigaCoWork ещё не подключён.')
    html = html.replace('Рабочее место ведущего', 'Настройки ведущего')
    (destination/'index.html').write_text(html)
    (destination/'.nojekyll').touch()
    print(f'Built browser demo: {destination}')

if __name__ == '__main__':
    build(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'site')

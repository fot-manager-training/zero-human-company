"""Draw portable explanatory diagrams for this game's ten-role process."""
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'static'
STYLE = '''text{font-family:Arial,Helvetica,sans-serif;fill:#1d314e}.title{font-size:25px;font-weight:700;letter-spacing:-.6px}.zone{font-size:11px;font-weight:700;letter-spacing:1.4px;fill:#7295bd}.name{font-size:15px;font-weight:700}.body{font-size:12px;fill:#7790ad}.small{font-size:10px;fill:#89a0bb}.label{font-size:11px;fill:#5c80af}.line{fill:none;stroke:#77a4d8;stroke-width:2;marker-end:url(#arrow)}.dash{stroke-dasharray:6 5}.human{stroke:#99ba35}.emph{fill:#467ec7}.num{font-size:11px;fill:#93acd0}.box{fill:#fff;stroke:#cbdbef;stroke-width:1.5}'''

def text(x,y,value,cls='body',anchor='start'):
    return f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}">{escape(str(value))}</text>'

def box(x,y,w,h,title,lines=(),fill='#fff',stroke='#cbdbef'):
    result=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="13" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
    titles=title if isinstance(title,list) else [title]
    for i,line in enumerate(titles): result+=text(x+w/2,y+28+i*20,line,'name','middle')
    start=y+28+len(titles)*20+6
    for i,line in enumerate(lines): result+=text(x+w/2,start+i*20,line,'body','middle')
    return result

def line(path,dashed=False,human=False):
    return f'<path d="{path}" class="line {"dash" if dashed else ""} {"human" if human else ""}"/>'

def zone(x,y,w,h,label):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="19" fill="#f8fbff" stroke="#c9daf0" stroke-dasharray="7 5"/>'+text(x+20,y+29,label,'zone')

def save(name,w,h,title,body):
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#77a4d8"/></marker><style>{STYLE}</style></defs><rect width="{w}" height="{h}" rx="20" fill="#fff"/>{body}</svg>'''
    (OUT/name).write_text(svg)

def architecture():
    s=text(32,47,'Человек → рабочее пространство → игровой движок','title')
    s+=zone(20,92,260,683,'КОМАНДА И ЗАЛ')+zone(310,92,315,683,'GIGACOWORK')+zone(655,92,595,683,'СЕРВЕР ИГРЫ · HTTPS')
    s+=box(42,160,216,112,'Команды столов',['Пишут поручения','Проверяют результаты'], '#f6fbdc','#cfdf8c')
    s+=box(42,408,216,112,'Капитан команды',['Согласует закупку','Решает, можно ли продолжать'],'#f6fbdc','#cfdf8c')
    s+=box(42,612,216,112,'Большой экран',['Помощники и документы','Реплики и этапы процесса'],'#eef4ff')
    s+=box(332,160,270,112,'10 рабочих пространств',['Своя роль и помощник','для каждого стола'],'#edf5ff')
    s+=box(332,347,270,112,'Контекст помощника',['Бриф, инструкция, примеры','Прайс, список, макеты'])
    s+=box(332,565,270,117,'Интеграционный адаптер',['Текст + ID стола + ID запроса','Поручения и результаты'],'#edf5ff')
    s+='<rect x="675" y="145" width="330" height="521" rx="17" fill="#edf3ff" stroke="#9ebdec"/>'
    s+=box(695,168,290,94,'Входной API',['Определить стол','Проверить запрос и повторы'])
    s+=box(695,291,290,104,['GigaNetwork','Оркестратор процесса'],['Условия перехода между ролями'])
    s+=box(695,424,290,88,'Документы и версии',['Тираж, смета, макет, заказ'])
    s+=box(695,541,290,88,'Журнал событий',['Сообщения, статусы, передачи'])
    s+=box(1030,291,194,185,['Контроль','результата'],['Обязательные поля','Лимит бюджета','Версия макета','Бренд-чек-лист'])
    s+=line('M258 215H332',human=True)+text(295,198,'задача','label','middle')
    s+=line('M467 272V347')+text(480,317,'читает','small')
    s+=line('M467 459V565')+text(481,516,'контекст','small')
    s+=line('M602 623H638V216H695')+text(631,493,'HTTPS','label','middle')
    s+=line('M840 262V291')+line('M840 395V424')+line('M840 512V541')
    s+=line('M985 326H1030')+line('M1030 443H1014V368H985',dashed=True)
    s+=line('M840 629V748H292V669H258',dashed=True)+text(555,731,'События → обновление экрана','label','middle')
    s+=line('M258 464H294V805H1014V466H1030',dashed=True,human=True)+text(646,828,'Решение человека разрешает продолжение цепочки','label','middle')
    save('architecture.svg',1280,855,'Состав игрового стенда',s)

def diamond(x,y,label='+',color='#73a5df'):
    return f'<path d="M{x} {y-27}L{x+27} {y}L{x} {y+27}L{x-27} {y}Z" fill="#f1f6ff" stroke="{color}" stroke-width="2"/>'+text(x,y+6,label,'name','middle')

def task(x,y,title,table):
    return box(x-80,y-38,160,76,title,[f'Стол {table:02}'])

def process():
    s=text(30,46,'Две ветки подготовки, один общий результат','title')
    s+='<circle cx="40" cy="230" r="16" fill="#fff" stroke="#769fce" stroke-width="2"/>'
    for path in ['M56 230H80','M240 230H263','M317 230H329V120H340','M329 230V340H340','M500 120H540','M500 340H540','M700 120H740V230H753','M700 340H740V230','M807 230H820','M980 230H1003','M1057 230H1090','M1170 268V470','M1090 508H1030','M870 508H810','M650 508H586']:
        s+=line(path)
    s+=task(160,230,'1. Гендиректор',1)+diamond(290,230)
    s+=task(420,120,'2. Партнёры',2)+task(620,120,'3. Финансы',3)
    s+=task(420,340,'4. Дизайн',4)+task(620,340,'5. Бренд-контроль',5)
    s+=diamond(780,230)+task(900,230,'6. Закупки',6)+diamond(1030,230,'×','#a5bd4a')
    s+=task(1170,230,'7. Производство',7)+task(1170,508,'8. Логистика',8)+task(950,508,'9. Приёмка',9)+task(730,508,'10. Выдача',10)
    s+='<circle cx="566" cy="508" r="18" fill="#eef6ff" stroke="#5590d8" stroke-width="4"/>'
    s+=box(917,35,238,84,'Решение капитана',['Смета в лимите? Заказ верен?'],'#f8fcdf','#cadc8d')
    s+=line('M1030 119V203',dashed=True,human=True)
    s+=text(1075,211,'да','small')+text(1030,292,'Без согласования — ожидание','label','middle')
    s+=text(780,413,'Закупки ждут тираж, смету и одобренный макет.','body','middle')
    s+=text(555,577,'+  Параллельные ветки: готовятся независимо, объединяются перед заказом.','body')
    s+=text(555,600,'×  Решение человека: производство начинается после согласования.','body')
    save('process.svg',1300,635,'BPMN-цепочка бизнес-игры с десятью ролями',s)

def sequence():
    lanes=[(100,'Команда стола'),(370,'Помощник GigaCoWork'),(650,'Игровой движок'),(910,'Проверка'),(1170,'Большой экран')]
    s=text(30,45,'Пример: стол 03 готовит смету на 110 подарков','title')
    for x,title in lanes:
        s+=box(x-94,76,188,58,title,[], '#f2f7ff')
        s+=f'<path d="M{x} 134V1280" fill="none" stroke="#d5e2f2" stroke-dasharray="4 5"/>'
    steps=[(2,4,'1. Этап финансов доступен: входные данные готовы'),(0,1,'2. «Рассчитай полную стоимость заказа»'),(1,2,'3. Поручение: ID стола, ID запроса, текст'),(2,1,'4. Вход: тираж 110 шт. и прайс'),(2,4,'5. Помощник начал работу'),(1,2,'6. Смета: 110 × (420 + 80) + 5 000 = 60 000 ₽'),(2,3,'7. Проверить полноту сметы и лимит'),(3,2,'8. В лимите: 60 000 ₽ ≤ 80 000 ₽'),(2,4,'9. Результат готов; смета передана закупкам'),(2,1,'10. Структурированный результат для команды'),(1,0,'11. Смета и пояснение расчёта'),(0,1,'12. «Упаковка и доставка учтены?»'),(1,0,'13. «Да, включены в общую стоимость»'),(2,0,'14. Закупки запрашивают решение капитана'),(0,2,'15. Человек согласует заказ'),(2,4,'16. Переход к производству разрешён')]
    for i,(a,b,label) in enumerate(steps):
        y=190+i*66;x1=lanes[a][0];x2=lanes[b][0]
        s+=line(f'M{x1} {y}H{x2}',dashed=b==4,human=a==0)
        s+=text((x1+x2)/2,y-13,label,'label','middle')
    s+=text(30,1285,'Сплошная стрелка — поручение, данные или решение. Пунктир — событие для визуализации.','body')
    save('request.svg',1290,1320,'Путь одного поручения и согласование результата',s)

def states():
    s=text(30,45,'Состояние помощника следует за событиями процесса','title')
    entries=[(110,'Ожидает',['Входные данные','ещё не готовы'],'#f6f8fb'),(330,'Ваш ход',['Можно написать','поручение'],'#eef5ff'),(550,'Работает',['Расчёты, проверки,','подготовка результата'],'#fff8df'),(770,'Результат готов',['Данные доступны','для следующей роли'],'#eef9ed'),(990,'Доставка данных',['Персонаж несёт','информацию коллеге'],'#edf5ff'),(1210,'Свёрнут',['Задача завершена,','карточка компактна'],'#f6f8fb')]
    for i,(x,title,lines,fill) in enumerate(entries):
        s+=box(x-88,144,176,126,title,lines,fill)
        if i<5:s+=line(f'M{x+88} 207H{x+132}')
    s+=box(240,364,188,113,'Нужно решение',['Закупки показывают','рекомендацию человеку'],'#f8fcdf','#cadc8d')
    s+=box(480,364,188,113,'Капитан согласовал',['Заказ проверен','Можно выполнять'],'#f8fcdf','#cadc8d')
    s+=line('M330 270V364',dashed=True,human=True)+line('M428 420H480',human=True)+line('M574 364V305H550V270',dashed=True,human=True)
    s+=text(330,320,'Для закупок','label','middle')
    s+=text(740,376,'Во время работы раскрывается карточка с действием','body')
    s+=text(740,401,'и коротким пояснением. Во время общения — отправитель','body')
    s+=text(740,426,'и получатель. После доставки помощник сворачивается.','body')
    s+=text(740,469,'Сообщения находятся в отдельной полосе под сценой.','body')
    save('states.svg',1320,540,'Работа, общение и ожидание решения человека',s)

if __name__=='__main__':
    architecture();process();sequence();states()
    print('Wrote architecture.svg, process.svg, request.svg, states.svg')

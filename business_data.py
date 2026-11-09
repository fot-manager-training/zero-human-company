"""Deterministic synthetic business sources, shared with the Python game."""
CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Нижний Новгород']
SEGMENTS = ['Стратегический', 'Технологический', 'Региональный', 'Сервисный']

def partners():
    rows=[]
    for i in range(1,1193):
        rows.append({'recipient_id':f'P-{i:04}', 'company':f'Партнёр {i:04}', 'contact':f'Контакт {i:04}',
            'email':f'partner{i:04}@example.org', 'city':CITIES[(i-1)%len(CITIES)],
            'segment':SEGMENTS[(i-1)%len(SEGMENTS)], 'table':(i-1)%10+1,
            'selected':i<=100, 'consent':i<=100 or i%5!=0, 'score':50+(i*7)%51})
    for i in range(8):
        duplicate=dict(rows[i]);duplicate['duplicate_note']='Повторная загрузка из второго списка';rows.append(duplicate)
    return rows

def sources():
    return {'partners':partners(), 'suppliers':[
        {'id':'A','name':'Мастерская «Север»','ball':420,'pack':80,'delivery':5000,'days':2,'rating':4.8,'on_time':True},
        {'id':'B','name':'Фабрика «Праздник»','ball':445,'pack':75,'delivery':8000,'days':3,'rating':4.6,'on_time':True},
        {'id':'C','name':'Студия «Форма»','ball':395,'pack':95,'delivery':6500,'days':4,'rating':4.4,'on_time':False}],
        'designs':[{'id':'A','color':'Изумрудный','hex':'#337d68'},{'id':'B','color':'Синий','hex':'#558ec7'},{'id':'C','color':'Бордовый','hex':'#9a5668'}],
        'price':{'ball':420,'pack':80,'delivery':5000},'schema_version':1}

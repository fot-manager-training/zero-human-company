import json
import os
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from server import Game, Handler

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.server.game=Game(self.tmp.name+'/api.sqlite3')
        threading.Thread(target=self.server.serve_forever,daemon=True).start()
        self.url='http://127.0.0.1:'+str(self.server.server_port)
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.server.game.db.close();self.tmp.cleanup()
    def request(self,path,payload=None,token=None):
        headers={'Content-Type':'application/json'}
        if token: headers['Authorization']='Bearer '+token
        request=urllib.request.Request(self.url+path,data=json.dumps(payload).encode() if payload is not None else None,headers=headers)
        try:
            with urllib.request.urlopen(request) as r: return r.status,json.load(r)
        except urllib.error.HTTPError as e: return e.code,json.load(e)
    def test_webhook_authentication_and_duplicate_delivery(self):
        payload={'table_id':1,'text':'Подарки партнёрам','request_id':'api-1'}
        with patch.dict(os.environ,{},clear=False):
            os.environ.pop('GAME_WEBHOOK_TOKEN',None)
            self.assertEqual(self.request('/api/integrations/gigacowork',payload)[0],503)
            os.environ['GAME_WEBHOOK_TOKEN']='test-only-token'
            self.assertEqual(self.request('/api/integrations/gigacowork',payload,'wrong')[0],401)
            first=self.request('/api/integrations/gigacowork',payload,'test-only-token')
            second=self.request('/api/integrations/gigacowork',payload,'test-only-token')
            self.assertEqual(first[0],200);self.assertEqual(first,second)
            self.assertEqual(len(self.server.game.state['messages']),1)
            self.assertEqual(self.server.game.state['messages'][0]['source'],'gigacowork')
    def test_bad_input_health_and_state(self):
        self.assertEqual(self.request('/api/health'),(200,{'ok':True,'mode':'synthetic'}))
        self.assertEqual(self.request('/api/messages',{'table_id':True,'text':'x'})[0],400)
        self.assertEqual(self.request('/api/messages',{'table_id':1,'text':' '})[0],400)
        self.assertEqual(self.request('/api/state')[1]['agents'][0]['status'],'waiting')
        self.assertEqual(self.request('/api/missing')[0],404)

import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
from server import Game, GameError

class GameTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.tmp.name)/'game.db')
        self.g = Game(self.path)
        self.now = 10**12
    def tearDown(self):
        self.g.db.close()
        self.tmp.cleanup()
    def advance(self):
        self.now += 10
        self.g.tick(self.now)
        self.now += 10
        self.g.tick(self.now)
    def test_full_chain_and_human_gate(self):
        self.g.action({'action':'start'})
        for _ in range(8): self.advance()
        s = self.g.snapshot()
        self.assertEqual(s['agents'][5]['status'], 'approval')
        self.assertEqual(s['agents'][6]['status'], 'waiting')
        self.assertEqual(s['order']['quantity'], 110)
        self.assertEqual(s['order']['total'], 60000)
        self.assertEqual(s['agents'][1]['output']['Исключено дублей'], 8)
        self.g.action({'action':'approve'})
        for _ in range(8): self.advance()
        s = self.g.snapshot()
        self.assertTrue(s['complete'])
        self.assertEqual(s['order']['accepted'], 110)
        self.assertEqual(s['agents'][9]['output']['По столам'], {str(i):10 for i in range(1,11)})
        self.assertEqual(s['agents'][9]['output']['Остаток в резерве'], 10)
    def test_over_budget_cannot_approve(self):
        self.g.configure({'budget':10000, 'reserve':5})
        self.g.action({'action':'start'})
        for _ in range(8): self.advance()
        self.assertEqual(self.g.state['order']['quantity'],105)
        with self.assertRaises(GameError): self.g.action({'action':'approve'})
        self.assertFalse(self.g.state['approval'])
    def test_manual_mode_dependencies_and_idempotency(self):
        with self.assertRaises(GameError): self.g.message({'table_id':2,'text':'Начать'})
        self.g.action({'action':'start','auto':False})
        self.advance()
        self.assertEqual(self.g.state['agents'][1]['status'],'ready')
        with self.assertRaises(GameError): self.g.message({'table_id':6,'text':'Заказать'})
        msg={'table_id':2,'text':'Рассчитать','request_id':'external-1'}
        first=self.g.message(msg)
        count=len(self.g.state['events'])
        self.assertEqual(self.g.message(msg),first)
        self.assertEqual(len(self.g.state['events']),count)
        self.advance()
        self.assertEqual(self.g.state['order']['quantity'],110)
        self.assertEqual(self.g.state['agents'][3]['status'],'ready')
    def test_pause_and_restart_preserve_order(self):
        self.g.action({'action':'start'})
        self.g.tick()
        self.g.action({'action':'pause'})
        self.g.tick(10**12)
        self.assertEqual(self.g.state['agents'][0]['status'],'working')
        restored=Game(self.path)
        self.assertEqual(restored.state['order'],self.g.state['order'])
        self.assertFalse(restored.state['running'])
        restored.action({'action':'resume'})
        restored.tick(10**12)
        self.assertEqual(restored.state['agents'][0]['status'],'done')
        restored.db.close()
    def test_config_validation_is_atomic_and_locked_after_start(self):
        with self.assertRaises(GameError): self.g.configure({'reserve':5,'design':'BAD'})
        self.assertEqual(self.g.state['config']['reserve'],10)
        self.g.action({'action':'start'})
        with self.assertRaises(GameError): self.g.configure({'budget':90000})
    def test_reset_clears_state_and_changes_id(self):
        old=self.g.state['id']
        self.g.action({'action':'start'})
        self.g.action({'action':'reset'})
        self.assertNotEqual(self.g.state['id'],old)
        self.assertEqual(self.g.state['events'],[])
        self.assertFalse(self.g.state['started'])

    def test_synthetic_approval_and_real_handoff_events(self):
        self.g.configure({'auto_approve': True, 'speed': 16})
        self.g.action({'action':'start'})
        for _ in range(15): self.advance()
        state = self.g.snapshot()
        self.assertTrue(state['complete'])
        transfers = [e['data'] for e in state['events'] if e['kind'] == 'transfer']
        self.assertEqual(len(transfers), 12)
        self.assertEqual({t['to'] for t in transfers if t['from'] == 1}, {2, 4})
        self.assertEqual({t['from'] for t in transfers if t['to'] == 6}, {2, 3, 5})
        self.assertIn('110', next(t['text'] for t in transfers if t['from'] == 2))
        self.assertEqual(transfers[-1]['to'], 0)
        self.assertTrue(any(e['kind'] == 'human' and e.get('data', {}) and e['data'].get('synthetic') for e in state['events']))
        self.assertEqual(len([e for e in state['events'] if e['kind']=='dialogue']), 10)

    def test_live_speed_scales_remaining_time_and_preserves_pause(self):
        with patch('server.time.time', return_value=100):
            self.g.action({'action':'start'})
            self.g.tick(100)
            self.assertEqual(self.g.state['agents'][0]['due'], 103)
            self.g.configure({'speed': 16})
            self.assertAlmostEqual(self.g.state['agents'][0]['due'], 100.1875)
            self.g.action({'action':'pause'})
            self.g.configure({'speed': 8})
            self.assertAlmostEqual(self.g.state['agents'][0]['due'], 100.375)
        with patch('server.time.time', return_value=200):
            self.g.action({'action':'resume'})
            self.assertAlmostEqual(self.g.state['agents'][0]['due'], 200.375)
            self.g.tick(200.5)
            self.assertEqual(self.g.state['agents'][0]['status'], 'done')

if __name__=='__main__': unittest.main()

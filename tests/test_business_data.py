import unittest
from business_data import sources
from server import Game

class BusinessDataTests(unittest.TestCase):
    def test_campaign_and_game_share_the_same_source(self):
        data = sources()
        self.assertEqual(len(data['partners']), 1200)
        selected = [r for r in data['partners'] if r['selected']]
        self.assertEqual(len(selected), 108)
        self.assertEqual(len({r['recipient_id'] for r in selected}), 100)
        self.assertTrue(all(r['consent'] for r in selected))
        game = Game(':memory:')
        try:
            game.output(2)
            game.output(3)
            self.assertEqual(game.state['order']['quantity'], 110)
            self.assertEqual(game.state['order']['total'], 60000)
        finally:
            game.db.close()

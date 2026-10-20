import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lead_pipeline import prepare

class PipelineTests(unittest.TestCase):
    def test_dedupe_and_review(self):
        sample = [
            {"business": "Example Shop", "email": "SHOP@example.com", "source_url": "https://example.com/contact"},
            {"business": "Example Shop", "email": "shop@example.com", "source_url": "https://example.com/contact"},
            {"business": "No Source", "email": "other@example.com", "source_url": ""},
        ]
        ready, rejected = prepare(sample, [], [])
        self.assertEqual(len(ready), 1)
        self.assertEqual(len(rejected), 2)
        self.assertEqual(ready[0]["status"], "Ready for review")
        self.assertIn("months two and three free", ready[0]["draft"])

    def test_prior_sent_blocked(self):
        ready, rejected = prepare(
            [{"business": "Shop", "email": "shop@example.com", "source_url": "https://example.com"}],
            [], [{"to": "shop@example.com"}]
        )
        self.assertEqual(len(ready), 0)
        self.assertEqual(rejected[0]["reason"], "duplicate or previously contacted")

if __name__ == "__main__":
    unittest.main()

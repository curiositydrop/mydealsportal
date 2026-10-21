import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lead_pipeline import prepare

class PipelineTests(unittest.TestCase):
    def test_missing_history_rejected(self):
        with self.assertRaises(ValueError):
            prepare([], None, [])
        with self.assertRaises(ValueError):
            prepare([], [], None)

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
        self.assertIn("while continuously subscribed", ready[0]["draft"])

    def test_credential_bearing_source_url_rejected(self):
        ready, rejected = prepare([{"business":"Example", "email":"contact@example.com", "source_url":"https://user:secret@example.com/contact"}], [], [])
        self.assertFalse(ready)
        self.assertEqual(rejected[0]["reason"], "missing or unsafe public contact source URL")

    def test_business_duplicate_with_different_email(self):
        candidates = [{"business": "Example Shop", "email": "new@example.com", "source_url": "https://example.com/contact"}]
        existing = [{"Business": "Example Shop", "Public email": "old@example.com"}]
        ready, rejected = prepare(candidates, existing, [])
        self.assertEqual(ready, [])
        self.assertEqual(rejected[0]["reason"], "business already in CRM or candidate batch")

    def test_opted_out_candidate(self):
        candidates = [{"business": "Example Shop", "email": "new@example.com", "source_url": "https://example.com/contact", "opted_out": "yes"}]
        ready, rejected = prepare(candidates, [], [])
        self.assertEqual(ready, [])
        self.assertEqual(rejected[0]["reason"], "opted out")

    def test_prior_sent_blocked(self):
        ready, rejected = prepare(
            [{"business": "Shop", "email": "shop@example.com", "source_url": "https://example.com"}],
            [], [{"to": "shop@example.com"}]
        )
        self.assertEqual(len(ready), 0)
        self.assertEqual(rejected[0]["reason"], "duplicate or previously contacted")

if __name__ == "__main__":
    unittest.main()

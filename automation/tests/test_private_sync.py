import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import private_sync

class PrivateSyncTests(unittest.TestCase):
    def test_fetch_sheet_rows(self):
        with patch.object(private_sync, "request_json", return_value={
            "values": [["Business", "Public email", "Opted out?"], ["Example", "hello@example.com", "No"]]
        }) as request:
            result = private_sync.fetch_sheet_rows("fake", "sheet")
        self.assertEqual(result[0]["Public email"], "hello@example.com")
        self.assertIn("spreadsheets/sheet/values/Leads!A1:R", request.call_args.args[0])

    def test_pagination(self):
        pages = [
            {"messages": [{"id": "a"}], "nextPageToken": "next"},
            {"messages": [{"id": "b"}]}
        ]
        with patch.object(private_sync, "request_json", side_effect=pages):
            ids, truncated = private_sync.list_sent_ids("fake")
        self.assertEqual(ids, ["a", "b"])
        self.assertFalse(truncated)

    def test_cap_fails_closed(self):
        with patch.object(private_sync, "request_json", return_value={
            "messages": [{"id": "a"}], "nextPageToken": "more"
        }):
            ids, truncated = private_sync.list_sent_ids("fake", max_pages=1)
        self.assertTrue(truncated)

    def test_wrong_sender_account_blocked(self):
        with patch.object(private_sync, "request_json", return_value={"emailAddress": "other@example.com"}):
            with self.assertRaises(RuntimeError):
                private_sync.verify_sender_account("fake")

    def test_correct_sender_account_accepted(self):
        with patch.object(private_sync, "request_json", return_value={"emailAddress": "mbergeron79@gmail.com"}):
            private_sync.verify_sender_account("fake")

    def test_all_sent_mail_included(self):
        with patch.object(private_sync, "request_json", return_value={"messages": []}) as request:
            private_sync.list_sent_ids("fake")
        self.assertIn("in%3Asent", request.call_args.args[0])
        self.assertNotIn("MyDealsPortal", request.call_args.args[0])

    def test_recipient_header_parsing(self):
        with patch.object(private_sync, "request_json", return_value={
            "payload": {"headers": [{"name": "To", "value": "Shop <SHOP@example.com>, owner@example.com"}]}
        }):
            result = private_sync.sent_recipients("fake", ["message"])
        self.assertEqual(result, {"shop@example.com", "owner@example.com"})

if __name__ == "__main__":
    unittest.main()

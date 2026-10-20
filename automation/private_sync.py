#!/usr/bin/env python3
"""Private, read-only CRM/Gmail sync for outreach deduplication.

Requires OAuth credentials provisioned outside this repository.
Never prints email addresses or saves exported data to the repo.
"""
import argparse
import csv
import io
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode

SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

def request_json(url, access_token):
    req = Request(url, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
    with urlopen(req, timeout=30) as response:
        return json.load(response)

def fetch_sheet_rows(token, spreadsheet_id, sheet_name="Leads"):
    url = f"{SHEETS_API}/{spreadsheet_id}/values/{sheet_name}!A1:R"
    rows = request_json(url, token).get("values", [])
    if not rows:
        return []
    return [dict(zip(rows[0], row)) for row in rows[1:]]

def list_sent_ids(token, query='in:sent "MyDealsPortal.com"', max_pages=50):
    ids = []
    page_token = None
    for _ in range(max_pages):
        params = {"q": query, "maxResults": 100}
        if page_token:
            params["pageToken"] = page_token
        payload = request_json(f"{GMAIL_API}/messages?{urlencode(params)}", token)
        ids.extend(message["id"] for message in payload.get("messages", []))
        page_token = payload.get("nextPageToken")
        if not page_token:
            return ids, False
    return ids, True

def sent_recipients(token, ids):
    addresses = set()
    for message_id in ids:
        payload = request_json(f"{GMAIL_API}/messages/{message_id}?format=metadata&metadataHeaders=To", token)
        for header in payload.get("payload", {}).get("headers", []):
            if header.get("name", "").lower() == "to":
                from email.utils import getaddresses
                addresses.update(address.lower() for _, address in getaddresses([header["value"]]) if address)
    return addresses

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--spreadsheet-id", required=True)
    parser.add_argument("--output-dir", required=True, help="Private directory, never inside a public repo")
    args = parser.parse_args()
    sheets_token = os.environ.get("GOOGLE_SHEETS_ACCESS_TOKEN")
    gmail_token = os.environ.get("GMAIL_READONLY_ACCESS_TOKEN")
    if not sheets_token or not gmail_token:
        sys.exit("Missing read-only OAuth tokens. No data fetched.")
    destination = Path(args.output_dir).resolve()
    if (Path.cwd().resolve() == destination or Path.cwd().resolve() in destination.parents):
        sys.exit("Refusing to write private data inside the working repository.")
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    leads = fetch_sheet_rows(sheets_token, args.spreadsheet_id)
    ids, truncated = list_sent_ids(gmail_token)
    if truncated:
        sys.exit("Sent-mail pagination cap reached; refusing incomplete deduplication.")
    sent = sorted(sent_recipients(gmail_token, ids))
    for filename, headers, rows in (
        ("existing.csv", ["Public email", "Business", "Opted out?"], [[r.get("Public email", ""), r.get("Business", ""), r.get("Opted out?", "")] for r in leads]),
        ("sent.csv", ["to"], [[address] for address in sent]),
    ):
        path = destination / filename
        with open(path, "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(headers)
            writer.writerows(rows)
        path.chmod(0o600)
    print(f"Synced {len(leads)} CRM rows and {len(sent)} unique sent recipients to private directory. No messages sent.")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Review-only lead preparation. No email sending, secrets, or external API calls."""
import argparse
import csv
import json
import re
from pathlib import Path
from urllib.parse import urlparse

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
FIELDS = ("business", "category", "city", "state", "website", "email", "source_url")

def normalized_email(value):
    return (value or "").strip().lower()

def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))

def prepare(candidates, existing, prior_sent):
    blocked = {normalized_email(x.get("email") or x.get("Public email")) for x in existing}
    blocked |= {normalized_email(x.get("email") or x.get("to")) for x in prior_sent}
    results, seen, rejected = [], set(), []
    for lead in candidates:
        email = normalized_email(lead.get("email"))
        business = (lead.get("business") or "").strip()
        source = (lead.get("source_url") or "").strip()
        reason = None
        if not business or not EMAIL.fullmatch(email):
            reason = "missing business or invalid email"
        elif not source or urlparse(source).scheme not in ("https", "http") or not urlparse(source).netloc:
            reason = "missing public contact source URL"
        elif email in blocked or email in seen:
            reason = "duplicate or previously contacted"
        elif str(lead.get("opted_out", "")).strip().lower() in ("yes", "true", "1"):
            reason = "opted out"
        if reason:
            rejected.append({"business": business, "email": email, "reason": reason})
            continue
        seen.add(email)
        results.append({
            **{k: (lead.get(k) or "").strip() for k in FIELDS},
            "email": email,
            "status": "Ready for review",
            "subject": f"Put {business}'s deals in front of more customers!",
            "draft": (
                f"Hi there!\n\nWant more people discovering {business} and your specials? "
                "MyDealsPortal.com lets customers search for local deals by ZIP code, category, and keyword. "
                "Our Founding 100 offer is $44.99/month: pay for month one, get months two and three free, "
                "and lock in that rate for life. You can list unlimited deals for the same flat monthly price.\n\n"
                "Take a look: https://www.mydealsportal.com/\n\n"
                "Best,\nMike\n"
            )
        })
    return results, rejected

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True, help="Private CSV of candidate businesses")
    parser.add_argument("--existing", required=True, help="Private CRM export CSV")
    parser.add_argument("--sent", required=True, help="Private sent-email export CSV")
    parser.add_argument("--output", default="review-output.json")
    args = parser.parse_args()
    approved, rejected = prepare(read_csv(args.candidates), read_csv(args.existing), read_csv(args.sent))
    Path(args.output).write_text(json.dumps({"ready_for_review": approved, "rejected": rejected}, indent=2), encoding="utf-8")
    print(f"Ready for review: {len(approved)}; rejected: {len(rejected)}. No emails sent.")

if __name__ == "__main__":
    main()

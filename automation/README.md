# MyDealsPortal outreach pilot

This is an **offline, review-only** prospect preparation pipeline. It does not find leads on its own, access Gmail/Sheets, or send messages. The GitHub Action is manually triggered and only validates the script and runs tests.

**Privacy:** This is a public repository. Never commit real lead exports, email addresses, OAuth tokens, API keys, or CRM data. Keep all CSVs and JSON outputs on a private computer or private storage.

To run locally:

```bash
python automation/lead_pipeline.py --candidates /private/candidates.csv --existing /private/crm.csv --sent /private/sent.csv --output /private/review.json
```

Candidate CSV headers: `business,category,city,state,website,email,source_url`.
Existing CRM exports may use `Public email`; sent exports may use `to`. Include every historical recipient in sent exports to prevent duplicate outreach.

Review all generated drafts, business fit, source URLs, consent/opt-outs, and applicable commercial email requirements before sending. A source URL is required but not independently verified by this script. No scheduled emails are configured.

Future work: secure private credential storage, authenticated CRM/sent-history sync, public-contact discovery, opt-out handling, audit logs, and a rate-limited human-approved sending stage.

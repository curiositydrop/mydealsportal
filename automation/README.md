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


## Private read-only sync (not yet connected)

`automation/private_sync.py` can export a deduplication snapshot from the Google Sheets API and Gmail API **only after** valid OAuth access tokens are supplied through environment variables. It does not generate tokens, discover prospects, schedule jobs, or send email.

Required OAuth scopes:
- Google Sheets: `https://www.googleapis.com/auth/spreadsheets.readonly`
- Gmail: `https://www.googleapis.com/auth/gmail.readonly`

Use the intended `mbergeron79@gmail.com` account for Gmail authorization, and authorize an account that has read access to the CRM. Do not paste access tokens into ChatGPT, GitHub files, commits, workflow logs, or issue comments.

Run on a trusted private machine, with tokens loaded securely into `GOOGLE_SHEETS_ACCESS_TOKEN` and `GMAIL_READONLY_ACCESS_TOKEN`:

```bash
python automation/private_sync.py --spreadsheet-id 1uaapnRJj7ypROxGYmFn-JClNFWeU5OsqndpBJnFt7zE --output-dir /private/mydealsportal-sync
```

The script rejects output locations inside the working repository. Exports include personal contact information and must remain private. The Gmail sync now checks **all** sent messages for the intended account, rather than only messages mentioning MyDealsPortal. The code verifies the account is `mbergeron79@gmail.com` before exporting. For production-safe deduplication, also maintain explicit suppression records and business-level duplicate checks before approving outreach. Never assume a missing Gmail result means a business was never contacted.

**Status:** GitHub CI validates the offline pilot. OAuth credentials and private scheduled execution have not been provisioned; no live Gmail/Sheets API sync has run.

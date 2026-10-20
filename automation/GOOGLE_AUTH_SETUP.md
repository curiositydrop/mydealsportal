# Google authorization: safe rollout

The current outreach pilot is **read-only and review-only**. It cannot send email, obtain OAuth tokens, or discover leads automatically.

## Google OAuth setup

- The Google Cloud project has a Desktop OAuth client and a Web OAuth client. Neither client alone authorizes access to Gmail or Sheets.
- Request only `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/spreadsheets.readonly` for the first sync.
- Use `mbergeron79@gmail.com` for Gmail consent, and an account authorized to read the CRM spreadsheet.
- The Desktop client requires a trusted local OAuth-capable application to complete authorization; GitHub Actions cannot present the user's interactive consent prompt by itself.
- A Web client needs a real HTTPS callback handler with a registered exact redirect URI, CSRF state validation, and server-side token exchange. Do not invent a callback URL or use a public GitHub Pages site to handle secrets.
- Do not commit or share client secrets, access tokens, refresh tokens, CRM exports, or recipient lists in this public repository.
- OAuth apps in external **Testing** mode with Gmail restricted scopes commonly receive refresh tokens expiring after seven days. Plan an appropriate production authorization/verification strategy before unattended recurring execution.

## Deployment gates

1. Choose a trusted private token-broker/execution environment and implement an interactive OAuth callback with secure token storage and refresh.
2. Test read-only Gmail sent-history and Sheets CRM access; verify completeness and account identity.
3. Implement persistent opt-out, bounce, business-level deduplication and audit logs, with no sensitive output in GitHub logs or artifacts.
4. Test human-reviewed draft generation; validate truthful offers and applicable commercial email requirements.
5. Only after separate approval, implement Gmail send authorization with least-privilege scopes, daily rate limits and a kill switch.

**Current status:** No production OAuth credentials provisioned in GitHub; no live Google API sync or scheduled sending has been verified. Do not turn on automated sends.
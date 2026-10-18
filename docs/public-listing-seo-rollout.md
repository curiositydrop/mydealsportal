# Public listing SEO architecture — implementation plan

## Current limitations
- GitHub Pages serves static HTML. Deal and business pages currently fetch Firestore data in the browser.
- Their templates must remain `noindex,follow` until actual approved content is included in crawler-readable HTML.
- Google cannot reliably discover each dynamic URL from the two-entry sitemap.
- Firebase business and deal data is untrusted; never put owner email, phone used for login, billing IDs, redemption PINs, claim codes, or private Firestore records into generated HTML.

## Safe rollout
1. Build a server-side exporter using the Firebase Admin SDK with read-only credentials, executed by a protected scheduled GitHub Action or Cloud Function. Do not expose service-account credentials in GitHub Pages.
2. Export **only** active, approved deals and active public businesses. Enforce business publication eligibility as well as deal publication status. Exclude samples and removed or expired offers.
3. Produce stable static URLs such as `/listings/deals/<encoded-id>/index.html` and `/listings/businesses/<encoded-id>/index.html`. HTML-escape all fields and validate outbound links; add canonical URLs, unique title, meta description, and appropriate structured data only when fields are reliable.
4. Atomically publish generated HTML and an XML sitemap index. Ensure stale listings are removed and respond as not-found or noindex. Preserve current dynamic deal claiming and business interactions by linking back to the existing pages rather than rewriting payment/redemption code.
5. Add tests for XSS, invalid URLs, publication eligibility, removed records, robots directives, and sitemap consistency.
6. Preview on a nonproduction branch, test crawlers and mobile UI, then merge and verify Search Console indexing. Do not deploy until validated.

## Release gate
- Never automatically merge or deploy exporter changes before access controls, tests, and stale-listing removal are proven.
- No Stripe, payment webhook, Firebase Auth, redemption or Firestore rules changes are required.
- Existing `sitemap.xml` remains the minimal public landing-page sitemap until exporter is ready.

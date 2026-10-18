# Public listing SEO pipeline (development only)

The renderer (`render.mjs`) generates public business/deal HTML and a sitemap from allowlisted fields. The Firestore exporter (`export-firestore.mjs`) only **reads** approved candidate records and writes to a fresh local directory. It does not deploy, modify Firestore, or touch Stripe.

## Offline validation (no credentials)

```sh
node --test seo/*.test.mjs
node seo/preview.mjs path/to/fixture.json /tmp/mdp-seo-generated
node seo/stage.mjs /tmp/mdp-seo-generated /tmp/mdp-site-checkout-copy
```

The site checkout must be a **disposable copy**, never a working production checkout. Staging refuses a zero-listing export by default; `--allow-empty` is an explicit override for deliberate full removal only. Staging replaces `listings/` and `sitemap.xml` inside that copy and removes stale generated listings. The script rejects incomplete exports, symlinks, unexpected files, and unexpected existing listing content. Existing homepage and application pages are left untouched.

## Firebase validation (not yet performed)

Use Node 22 and install backend dependencies with `npm ci --prefix mydealsportal-backend` (the exporter resolves `firebase-admin` from that existing backend package), Application Default Credentials scoped to a **read-only Firestore IAM identity**, and a new empty export directory. Example:

```sh
GOOGLE_CLOUD_PROJECT=mydealsportal SEO_COUNT_ONLY=1 node seo/export-firestore.mjs /tmp/mdp-seo-firebase-export
# After reviewing counts and permissions, generate a local preview:
GOOGLE_CLOUD_PROJECT=mydealsportal node seo/export-firestore.mjs /tmp/mdp-seo-firebase-export
```

Do not commit generated customer data, Firebase credentials, or local exports. Validate generated URLs, content, candidate counts, and that inactive/canceled businesses are absent before staging. Verify with the real Firestore schema and indexes; no production data export has yet been run.

## Release gates

- Confirm GitHub CI green and inspect generated preview pages.
- Verify read-only Firestore export with actual records and no unexpected private data.
- Require an explicit review/approval before replacing production listing pages or sitemap.
- Publish from a clean checkout with a controlled deployment, remove stale pages, and verify 404 responses for removed URLs.
- Keep private account, login, dashboard, Stripe, redemption, and checkout code unchanged.
- Confirm Search Console sitemap fetch and monitor indexing after launch.

**This PR is not a production deployment.** Static public listing pages would be indexable; the existing dynamic deal/business templates remain noindex,follow.

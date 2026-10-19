# Public listing SEO pipeline (development only)

The renderer (`render.mjs`) generates public business/deal HTML and a sitemap from allowlisted fields. The Firestore exporter (`export-firestore.mjs`) only **reads** approved candidate records and writes to a fresh local directory. It does not deploy, modify Firestore, or touch Stripe.

## Offline validation (no credentials)

```sh
node --test seo/*.test.mjs
node seo/preview.mjs path/to/fixture.json /tmp/mdp-seo-generated
node seo/stage.mjs /tmp/mdp-seo-generated /tmp/mdp-site-checkout-copy
```

The site checkout must be a **disposable copy**, never a working production checkout. Staging refuses a zero-listing export by default; `--allow-empty` is an explicit override for deliberate full removal only. Staging replaces `listings/` and `sitemap.xml` inside that copy and removes stale generated listings. The script rejects incomplete exports, symlinks, unexpected files, and unexpected existing listing content. Existing homepage and application pages are left untouched.

## Firebase validation (completed in Cloud Shell on 2026-10-19)

Use Node 22 and install backend dependencies with `npm install --prefix mydealsportal-backend --no-save --package-lock=false` (the exporter resolves `firebase-admin` from that existing backend package), Application Default Credentials scoped to a **read-only Firestore IAM identity**, and a new empty export directory. Example:

```sh
GOOGLE_CLOUD_PROJECT=mydealsportal SEO_COUNT_ONLY=1 node seo/export-firestore.mjs /tmp/mdp-seo-firebase-export
# After reviewing counts and permissions, generate a local preview:
GOOGLE_CLOUD_PROJECT=mydealsportal node seo/export-firestore.mjs /tmp/mdp-seo-firebase-export
```

Do not commit generated customer data, Firebase credentials, or local exports. Validate generated URLs, content, candidate counts, and that inactive/canceled businesses are absent before staging. The Cloud Shell read-only export returned one business, one deal and three generated files. All 18 tests passed and a disposable staging check preserved the homepage and CNAME. This is a point-in-time verification, not an ongoing production release.

## Current hosting and release path

The production repository uses GitHub Pages with `CNAME` set to `www.mydealsportal.com`. The live `robots.txt` points at `/sitemap.xml`. Do not configure Firebase Hosting for this SEO release. Once validated, generated `listings/` and `sitemap.xml` must be staged into a **disposable GitHub Pages checkout**, reviewed, then released through the existing GitHub Pages source with an explicit approval. Keep the `CNAME`, homepage, payment, and application files intact.

## Scheduled refresh preview (not production deployment)

`.github/workflows/seo-refresh-preview.yml` is a scheduled **preview-only** workflow. It runs daily once on the default branch after merging, but its job is skipped until repository variables `SEO_WIF_PROVIDER` and `SEO_SERVICE_ACCOUNT` are configured. These must point to a Google Workload Identity Federation provider and a service account restricted to Firestore read access for the `mydealsportal` project. No service-account JSON key or user credentials should be stored in GitHub. The workflow exports, stages, and uploads a short-lived review artifact; it **never commits, pushes, or deploys**. Publication and stale-page removal still require a separately approved release path. Note that expiration is evaluated at export time; scheduled preview generation alone does not remove expired pages from the live website.

## Release gates

- Confirm GitHub CI green and inspect generated preview pages.
- Verify read-only Firestore export with actual records and no unexpected private data.
- Require an explicit review/approval before replacing production listing pages or sitemap.
- Publish from a clean checkout with a controlled deployment, remove stale pages, and verify 404 responses for removed URLs.
- Keep private account, login, dashboard, Stripe, redemption, and checkout code unchanged.
- Confirm Search Console sitemap fetch and monitor indexing after launch.

**This PR is not a production deployment.** Static public listing pages would be indexable; the existing dynamic deal/business templates remain noindex,follow.

## One-time GitHub-to-Google setup (requires owner review)

Review `seo/setup-github-identity.sh` before running it in Cloud Shell. It creates a Google Workload Identity pool/provider restricted to `curiositydrop/mydealsportal` on `refs/heads/main`, creates `seo-listings-reader`, grants `roles/datastore.viewer` (read-only project-wide Firestore visibility), and allows GitHub's matching identity to impersonate it. This is **a real IAM configuration change**, so run it only with owner approval and awareness of the project-wide read visibility. It does not create a key or publish any site changes. The workflow additionally requires two GitHub repository variables, printed by the script. GitHub's scheduled workflows only execute on the default branch, so the PR must be separately reviewed and merged before any schedule can run. The preview job still never deploys.


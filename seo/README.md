# Public listing SEO exporter (development only)

The pure renderer (`render.mjs`) accepts only approved public fields. The Firestore exporter (`export-firestore.mjs`) is **read-only** and writes HTML to an empty local output directory. It does not upload, deploy, change Firestore, or access Stripe.

Run tests with `node --test seo/render.test.mjs`.

To export a preview, install `firebase-admin` in an appropriate Node 22 environment, configure Google Application Default Credentials for a **read-only Firestore identity**, then run `node seo/export-firestore.mjs /tmp/mdp-seo-preview`. Do not commit credential files or generated customer data.

**Not ready for deployment:** production automation must regenerate to a clean staging directory, validate and atomically replace the published listing tree, remove old pages, preserve the existing homepage and sitemap, and handle stale URL removal. Never append generated pages indefinitely. Google may continue to index removed pages unless URLs return 404/410 or noindex; GitHub Pages removal yields 404.

The current business/deal templates remain noindex; this exporter creates separate static, indexable pages. It does not modify payment, checkout, claims, or subscriptions.

# MyDealsPortal redemption: final activation handoff

**Status: NOT LIVE.** The feature flag is off, the four redemption functions are not exported by production `index.js`, and GitHub PR checks are offline only. Do not merge or deploy this branch as a shortcut.

## What the site owner may need to do in Firebase
1. Open https://console.firebase.google.com/project/mydealsportal/appcheck and select the MyDealsPortal **web app**.
2. Register **reCAPTCHA Enterprise** for App Check if it is not already registered. The site key is a public configuration value (not a secret). Register the actual production hostnames `mydealsportal.com` and `www.mydealsportal.com` in the reCAPTCHA Enterprise configuration.
3. Record the reCAPTCHA Enterprise **site key only**. Never paste service-account JSON, Firebase private keys, Stripe secret keys, PINs, or passwords into chat.
4. For App Check replay protection, verify the Firebase Functions service account has the required **Firebase App Check Token Verifier** role/permission for token consumption. Test a limited-use token with `consume:true` and confirm a second use returns `alreadyConsumed:true`.
5. Confirm billing and quotas are enabled for Firebase Functions/Firestore and that the Firebase emulator can be used.

## Developer-only tasks remaining
- Add isolated emulator tests covering concurrent redemption, failed PIN, expired/unpublished deals, and claim quotas.
- Review cross-claim PIN guessing and anonymous claim flooding; per-claim lockout is not a complete per-source rate limit.
- Test App Check from both production domains and verify the browser SDK's limited-use token behavior.
- Confirm all four HTTPS functions deploy without modifying Stripe exports, webhook, checkout, or billing rules.
- Run a non-payment smoke test on a controlled deal and a checkout regression test without charging a real card.
- Fill `redemption-config.js` with the verified public site key and deployed endpoint URLs, then set `enabled:true` only after all checks pass.
- Verify the guest claim flow on iPhone, expiration handling, one-time redemption, PIN rotation, and recovery when localStorage is cleared.

## Known limitation
The existing live `deal.html` uses browser-generated reference codes; these are not server-verifiable. The new server-backed flow must replace them when activated. Guest codes saved only in localStorage cannot be recovered on a different device without an account or an additional recovery mechanism.

## Safe rollback
Set `redemption-config.js` `enabled:false` and redeploy the static site. Do not delete claims or PIN hashes during rollback. Billing functions remain independent.

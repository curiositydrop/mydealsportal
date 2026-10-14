# Guest deal redemption — isolated work in progress

This branch is **not production-ready**. Do not merge or deploy until the checklist below passes.

## Intended customer flow
1. A customer clicks Claim on a published deal.
2. A server endpoint creates an unpredictable one-time claim secret and stores only its SHA-256 digest in Firestore.
3. Browser localStorage keeps the claim code, so the customer can return later without logging in.
4. At checkout, a clerk privately enters the store's four-digit PIN into the customer's phone.
5. Server validates active business/deal and PIN, then atomically changes claim status from claimed to redeemed.
6. Customer sees a confirmation; the used code is no longer usable.

## Current draft components
- `mydealsportal-backend/redemption-core.js`: secure random codes, PIN hashing, validation.
- `mydealsportal-backend/redemption-service.js`: draft Firestore claim/redeem operations and claim-level PIN attempt limits.
- `redemption-client.js`: browser-side guest claim persistence.
- `mydealsportal-backend/redemption-core.test.js`: initial unit tests.

## REQUIRED before release
- [ ] Design authenticated business-owner PIN provisioning/rotation, server-only PIN hash storage, and location-specific PIN support.
- [ ] Implement public HTTPS endpoints with strict CORS, request validation, App Check or equivalent anti-abuse controls, IP/device throttling and quotas to limit anonymous claim flooding.
- [ ] Define expiry policy and whether one claim per browser/deal is sufficient; without consumer login, one claim per real person cannot be guaranteed.
- [ ] Add deal expiration enforcement; do not assume a free-text terms field is a machine-readable expiry.
- [ ] Build customer claim/redeem UI and My Claimed Deals page; reconcile local state with server after reload.
- [ ] Create Firestore rules that deny client writes to claim/PIN records; only privileged server functions may mutate them.
- [ ] Run unit tests, Firebase emulator tests for simultaneous redemption, bad PIN, expiry, and unpublished deals.
- [ ] Confirm no Stripe checkout/webhook/pricing changes and verify existing site behavior.
- [ ] Deploy to staging/controlled environment before production, then release with rollback plan.

## Production isolation
No redemption endpoints are exported from `mydealsportal-backend/index.js`. The live checkout, webhook, pricing and billing portal are unchanged.

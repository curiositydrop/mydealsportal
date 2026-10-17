# Redemption rollout

Automated tests passed, including the isolated full Firebase emulator flow. Production is not deployed.

1. Authenticate Firebase CLI and verify project ID `mydealsportal` with `firebase projects:list`.
2. From the reviewed feature branch, deploy only the new redemption functions:
   `firebase deploy --project mydealsportal --only functions:setRedemptionPin,functions:issueDealClaim,functions:getDealClaimStatus,functions:redeemDealClaim,functions:getBusinessRedemptionSummary`
3. Deploy Firestore rules separately: `firebase deploy --project mydealsportal --only firestore:rules`.
4. Confirm endpoints are reachable, then merge PR #6 and verify public site publication.
5. With a dedicated test business and deal, verify claim, wrong PIN, correct PIN, duplicate rejection, and dashboard counts.
6. Regression-check Stripe checkout, webhook, New Leaf lifetime-free billing, and business login.

Do not deploy all functions or change Stripe configuration. Record the prior site revision for rollback. If the CLI requires codebase-qualified function selectors, inspect the command targets before deploying.

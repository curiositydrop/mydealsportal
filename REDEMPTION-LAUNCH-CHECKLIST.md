# Secure redemption launch checklist

This feature is currently on `feature/secure-deal-redemption` (draft PR #6). **Do not deploy before integration checks pass.**

## Preconditions
- [ ] Both GitHub Actions suites pass on the final commit.
- [ ] Confirm Firebase CLI is authenticated to the intended project: `firebase use` and `firebase projects:list`. The expected project ID is `mydealsportal`.
- [ ] Confirm Firestore rules deny browser access to `redemptionSecrets`, `dealClaims`, and `redemptionLimits`.
- [ ] Confirm all existing Stripe endpoints and business publishing flows are unchanged.
- [ ] Confirm a safe test business is available with an approved, active deal. Do not use an actual customer's claim for tests.
- [ ] Confirm the business has an active/trialing subscription; owner lifetime-free subscription is eligible if its Stripe status is active.

## Deploy sequence (only after approval)
1. Review the diff of PR #6; merge only after validation.
2. From the reviewed commit, deploy rules and the new functions, using the Firebase CLI on the **correct project**. Do not blindly deploy all functions or change Stripe secrets.
3. Deploy the reviewed site pages only after endpoints are reachable.
4. Test as an anonymous customer: issue a claim, refresh, and recover the same claim code.
5. Verify a business owner with a verified email can configure the six-digit PIN once.
6. Try an incorrect PIN and confirm the claim is not redeemed; verify rate limits.
7. Redeem with the correct PIN; confirm a second attempt fails and a refresh still shows redeemed.
8. Check business dashboard totals, and confirm no other business can view them.
9. Verify sample ads cannot be claimed, inactive deals cannot be claimed, and the paid signup/checkout and existing deal listing still work.

## Rollback
- Preserve the previous site commit and Firebase function deployment details before launch.
- If an issue appears, restore the previous static pages; disable or roll back only new redemption functions as appropriate. Do not delete claim data without an explicit retention plan.
- Do not revert Stripe configuration or billing webhooks as part of redemption rollback.

## Outstanding risks
- Full Firebase integration testing has not been run yet.
- The current business-wide PIN attempt limit may inconvenience legitimate merchants during heavy redemption traffic; observe before broad rollout.
- No PIN reset/recovery workflow is provided. Business owners must contact support to reset a PIN.
- Redemption summary is capped at 1,000 claim records and is not a lifetime total beyond that limit.

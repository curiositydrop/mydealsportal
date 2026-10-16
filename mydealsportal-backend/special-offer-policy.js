// Eligibility is evaluated server-side from authenticated identity and stored business data.
// Never trust a browser-supplied discount, email, customer ID, or business name.
export function eligibleForOwnerLifetimeOffer(user, business) {
  return Boolean(
    user?.email_verified === true &&
    user?.uid &&
    business?.ownerUid === user.uid &&
    user.email?.trim().toLowerCase() === "newleafpaintingcompany@gmail.com" &&
    business.name?.trim().toLowerCase() === "new leaf painting co." &&
    !business.stripeSubscriptionId &&
    !["active", "trialing"].includes(business.subscriptionStatus)
  );
}

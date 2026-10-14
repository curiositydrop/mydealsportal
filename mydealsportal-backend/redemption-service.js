// Standalone draft endpoints. NOT exported from index.js and NOT deployed.
// Claim IDs are bearer secrets. Only their hashes are stored in Firestore.
// Requires abuse controls before public release (App Check/rate limits).
import { createHash } from "node:crypto";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { newClaimCode, canRedeem, verifyPin } from "./redemption-core.js";

const db = () => getFirestore();
const digest = value => createHash("sha256").update(value).digest("hex");
const bad = (status, error) => ({ status, error });
const validId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export async function createClaim(dealId) {
  if (!validId(dealId)) return bad(400,"Invalid deal");
  const dealSnap = await db().collection("deals").doc(dealId).get();
  const deal = dealSnap.data();
  if (!deal || deal.active !== true || deal.publishingApproved !== true) return bad(404,"Deal unavailable");
  const bizSnap = await db().collection("businesses").doc(deal.businessId).get();
  const biz = bizSnap.data();
  if (!biz || biz.status !== "active" || !["active","trialing"].includes(biz.subscriptionStatus))
    return bad(404,"Deal unavailable");
  const claimCode = newClaimCode();
  const claimRef = db().collection("redemptionClaims").doc(digest(claimCode));
  await claimRef.create({
    dealId, businessId:deal.businessId, status:"claimed",
    createdAt:FieldValue.serverTimestamp(), redeemedAt:null, failedPinAttempts:0, lockedUntil:0, expiresAt:Date.now()+30*24*60*60*1000
  });
  return {status:201,claimCode};
}

// Requires a private store PIN hash provisioned by an authenticated owner.
// A single transaction prevents simultaneous double-redemption.
export async function redeemClaim(claimCode,pin) {
  if (typeof claimCode !== "string" || !/^MDP-[0-9A-F]{20}$/.test(claimCode))
    return bad(400,"Invalid claim");
  const claimRef=db().collection("redemptionClaims").doc(digest(claimCode));
  return db().runTransaction(async tx=>{
    const claimSnap=await tx.get(claimRef);
    if (!claimSnap.exists) return bad(404,"Claim not found");
    const claim=claimSnap.data();
    if (claim.status==="redeemed") return bad(409,"Already redeemed");
    const bizRef=db().collection("businesses").doc(claim.businessId);
    const privateRef=db().collection("redemptionPrivate").doc(claim.businessId);
    const dealRef=db().collection("deals").doc(claim.dealId);
    const [bizSnap,dealSnap,privateSnap]=await Promise.all([tx.get(bizRef),tx.get(dealRef),tx.get(privateRef)]);
    const business=bizSnap.data(),deal=dealSnap.data();
    if (!business || business.status!=="active" || !["active","trialing"].includes(business.subscriptionStatus))
      return bad(403,"Business inactive");
    if (!canRedeem(claim,{...deal,id:claim.dealId},Date.now()))
      return bad(409,"Claim unavailable");
    if ((claim.lockedUntil||0)>Date.now()) return bad(429,"Too many PIN attempts. Try later.");
    if (!privateSnap.exists || !verifyPin(pin,privateSnap.data().pinHash)) {
      const attempts=((claim.lockedUntil||0) && (claim.lockedUntil||0)<=Date.now()) ? 1 : (claim.failedPinAttempts||0)+1;
      tx.update(claimRef,{failedPinAttempts:attempts,lockedUntil:attempts>=5?Date.now()+15*60*1000:0});
      return bad(403,"Invalid store PIN");
    }
    tx.update(claimRef,{
      status:"redeemed",redeemedAt:FieldValue.serverTimestamp(),
      failedPinAttempts:0,lockedUntil:0
    });
    return {status:200,redeemed:true};
  });
}

export async function getClaimStatus(claimCode) {
  if (typeof claimCode !== "string" || !/^MDP-[0-9A-F]{20}$/.test(claimCode))
    return bad(400,"Invalid claim");
  const snap=await db().collection("redemptionClaims").doc(digest(claimCode)).get();
  if (!snap.exists) return bad(404,"Claim not found");
  const claim=snap.data();
  return {status:200,dealId:claim.dealId,redeemed:claim.status==="redeemed",
    expired:typeof claim.expiresAt==="number" && claim.expiresAt<=Date.now()};
}

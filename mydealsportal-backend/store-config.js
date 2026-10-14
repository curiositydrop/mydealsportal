import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { hashPin, validatePin } from "./redemption-core.js";

// Call only after verifying the Firebase ID token on the server.
export async function saveStorePin(authUid, pin) {
  if (typeof authUid !== "string" || !authUid || !validatePin(pin))
    return { status: 400, error: "Invalid input" };
  const db = getFirestore();
  const business = await db.collection("businesses").doc(authUid).get();
  const data = business.data();
  if (!data || data.ownerUid !== authUid || data.status !== "active")
    return { status: 403, error: "Business owner access required" };
  if (!["active", "trialing"].includes(data.subscriptionStatus))
    return { status: 403, error: "Active subscription required" };
  // Public business documents are readable by visitors. NEVER store PINs there.
  await db.collection("redemptionPrivate").doc(authUid).set({
    pinHash: hashPin(pin),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { status: 200, configured: true };
}

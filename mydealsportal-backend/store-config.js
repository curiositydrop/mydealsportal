import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { hashPin, validatePin } from './redemption-core.js';

// Only invoke after verifying the business owner's Firebase ID token.
export async function saveStorePin(authUid, pin) {
  if (typeof authUid !== 'string' || !authUid || !validatePin(pin)) return {status:400,error:'Invalid input'};
  const db=getFirestore();
  const snap=await db.collection('businesses').doc(authUid).get();
  const data=snap.data();
  if (!data || data.ownerUid!==authUid || data.status!=='active' || !['active','trialing'].includes(data.subscriptionStatus)) return {status:403,error:'Business owner access required'};
  await db.collection('redemptionPrivate').doc(authUid).set({pinHash:hashPin(pin),failedPinAttempts:0,windowStart:0,lockedUntil:0,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return {status:200,configured:true};
}

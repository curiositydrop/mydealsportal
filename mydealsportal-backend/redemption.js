import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomBytes, createHash } from "node:crypto";
import { signedIn, allowOrigin } from "./live-common.js";
import { validPin, hashPin, verifyPin, eligibleDeal } from "./redemption-policy.js";

const db = getFirestore();
const sendError=(res,status,message)=>res.status(status).json({error:message});
const claimKey=code=>createHash("sha256").update(code).digest("hex");
const codePattern=/^MDP-[A-F0-9]{24}$/;
function route(req,res) {
  if(!allowOrigin(req,res))return false;
  if(req.method!=="POST"){sendError(res,405,"Method not allowed");return false;}
  if(JSON.stringify(req.body||{}).length>2048){sendError(res,413,"Request too large");return false;}
  return true;
}
function throttleKey(req) {
  const ip=String(req.ip||"unknown");
  return createHash("sha256").update(ip).digest("hex");
}
async function throttle(bucket,max,windowMs) {
  const ref=db.collection("redemptionLimits").doc(bucket);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),now=Date.now(),old=snap.data();
    const fresh=!old||old.resetAt<=now;
    const count=fresh?1:old.count+1;
    if(count>max)return false;
    tx.set(ref,{count,resetAt:fresh?now+windowMs:old.resetAt,updatedAt:FieldValue.serverTimestamp()});
    return true;
  });
}
export const setRedemptionPin=onRequest({region:"us-central1"},async(req,res)=>{
  if(!route(req,res))return;
  try {
    const user=await signedIn(req);
    if(!user.email_verified)return sendError(res,403,"Verify your business email first");
    const pin=req.body?.pin;
    if(!validPin(pin))return sendError(res,400,"Enter exactly six digits");
    const ref=db.collection("businesses").doc(user.uid);
    const snap=await ref.get();
    if(!snap.exists||snap.data().ownerUid!==user.uid)return sendError(res,403,"Business required");
    if(snap.data().redemptionPinSet)return sendError(res,409,"PIN already set; contact support to reset it");
    const secretRef=db.collection("redemptionSecrets").doc(user.uid);
    const digest=hashPin(pin);
    await db.runTransaction(async tx=>{
      const [business,secret]=await Promise.all([tx.get(ref),tx.get(secretRef)]);
      if(!business.exists||business.data().ownerUid!==user.uid||business.data().redemptionPinSet||secret.exists)throw Error("PIN already configured");
      tx.create(secretRef,{hash:digest,createdAt:FieldValue.serverTimestamp()});
      tx.update(ref,{redemptionPinSet:true});
    });
    return res.json({ok:true});
  }catch(e){console.error("PIN setup",e);return sendError(res,500,"Could not save PIN");}
});
export const issueDealClaim=onRequest({region:"us-central1"},async(req,res)=>{
  if(!route(req,res))return;
  try {
    if(!await throttle("claim-"+throttleKey(req),30,3600000))return sendError(res,429,"Too many claims; try later");
    const dealId=req.body?.dealId;
    if(typeof dealId!=="string"||!/^[a-zA-Z0-9]{10,80}$/.test(dealId))return sendError(res,400,"Invalid deal");
    const dealSnap=await db.collection("deals").doc(dealId).get();
    if(!eligibleDeal(dealSnap.data()))return sendError(res,404,"Deal unavailable");
    const businessSnap=await db.collection("businesses").doc(dealSnap.data().businessId).get();
    if(!businessSnap.exists||!["active","trialing"].includes(businessSnap.data().subscriptionStatus)||businessSnap.data().status!=="active")return sendError(res,404,"Deal unavailable");
    const pinSnap=await db.collection("redemptionSecrets").doc(dealSnap.data().businessId).get();
    if(!pinSnap.exists)return sendError(res,409,"This business has not enabled deal redemption yet");
    const code="MDP-"+randomBytes(12).toString("hex").toUpperCase();
    await db.collection("dealClaims").doc(claimKey(code)).create({
      dealId,businessId:dealSnap.data().businessId,status:"claimed",failedPinAttempts:0,
      claimedAt:FieldValue.serverTimestamp()
    });
    return res.json({code});
  }catch(e){console.error("Claim issue",e);return sendError(res,500,"Could not claim deal");}
});
export const getBusinessRedemptionSummary=onRequest({region:"us-central1"},async(req,res)=>{
  if(!route(req,res))return;
  try{
    const user=await signedIn(req);
    const business=await db.collection("businesses").doc(user.uid).get();
    if(!business.exists||business.data().ownerUid!==user.uid)return sendError(res,403,"Business required");
    const snapshot=await db.collection("dealClaims").where("businessId","==",user.uid).limit(1000).get();
    let claimed=0,redeemed=0;
    for(const item of snapshot.docs){
      if(item.data().status==="claimed")claimed++;
      if(item.data().status==="redeemed")redeemed++;
    }
    return res.json({claimed,redeemed,limited:snapshot.size===1000});
  }catch(e){console.error("Redemption summary",e);return sendError(res,500,"Could not load redemption summary");}
});
export const getDealClaimStatus=onRequest({region:"us-central1"},async(req,res)=>{
  if(!route(req,res))return;
  try{
    if(!await throttle("status-"+throttleKey(req),120,3600000))return sendError(res,429,"Too many requests");
    const code=req.body?.code;
    if(typeof code!=="string"||!codePattern.test(code))return sendError(res,400,"Invalid claim code");
    const snap=await db.collection("dealClaims").doc(claimKey(code)).get();
    if(!snap.exists)return sendError(res,404,"Claim not found");
    return res.json({status:snap.data().status});
  }catch(e){console.error("Claim status",e);return sendError(res,500,"Could not check claim");}
});
export const redeemDealClaim=onRequest({region:"us-central1"},async(req,res)=>{
  if(!route(req,res))return;
  try {
    if(!await throttle("redeem-"+throttleKey(req),10,3600000))return sendError(res,429,"Too many attempts; try later");
    const {code,pin}=req.body||{};
    if(typeof code!=="string"||!codePattern.test(code)||!validPin(pin))return sendError(res,400,"Invalid code or PIN");
    const claimRef=db.collection("dealClaims").doc(claimKey(code));
    const claimSnap=await claimRef.get(),claim=claimSnap.data();
    if(!claim||claim.status!=="claimed")return sendError(res,400,"Code invalid or already redeemed");
    if((claim.failedPinAttempts||0)>=5)return sendError(res,429,"This claim is locked. Contact the business.");
    const [dealSnap,secretSnap,businessSnap]=await Promise.all([
      db.collection("deals").doc(claim.dealId).get(),
      db.collection("redemptionSecrets").doc(claim.businessId).get(),
      db.collection("businesses").doc(claim.businessId).get()
    ]);
    if(!eligibleDeal(dealSnap.data())||dealSnap.data().businessId!==claim.businessId||!businessSnap.exists||businessSnap.data().status!=="active"||!["active","trialing"].includes(businessSnap.data().subscriptionStatus))return sendError(res,400,"Code or PIN incorrect");
    if(!verifyPin(pin,secretSnap.data()?.hash)){
      await db.runTransaction(async tx=>{
        const current=await tx.get(claimRef);
        if(current.data()?.status==="claimed")tx.update(claimRef,{failedPinAttempts:FieldValue.increment(1)});
      });
      return sendError(res,400,"Code or PIN incorrect");
    }
    const success=await db.runTransaction(async tx=>{
      const current=await tx.get(claimRef);
      if(current.data()?.status!=="claimed"||(current.data()?.failedPinAttempts||0)>=5)return false;
      tx.update(claimRef,{status:"redeemed",redeemedAt:FieldValue.serverTimestamp()});
      return true;
    });
    if(!success)return sendError(res,409,"Code already redeemed");
    return res.json({ok:true,status:"redeemed"});
  }catch(e){console.error("Redeem",e);return sendError(res,500,"Could not redeem deal");}
});

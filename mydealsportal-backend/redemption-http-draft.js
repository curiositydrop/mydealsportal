// Draft HTTPS functions. These exports are intentionally NOT connected to index.js.
// Deploy only after App Check, abuse protection, and emulator testing are completed.
import { onRequest } from "firebase-functions/v2/https";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createClaim, redeemClaim, getClaimStatus } from "./redemption-service.js";
import { saveStorePin } from "./store-config.js";
import {verifyRedemptionApp} from "./redemption-app-check.js";
if (!getApps().length) initializeApp();

const origins = new Set([
  "https://mydealsportal.com",
  "https://www.mydealsportal.com",
  "https://curiositydrop.github.io"
]);
function cors(req,res) {
  const origin=req.get("origin");
  if(origin && !origins.has(origin)){res.status(403).json({error:"Origin not allowed"});return false;}
  if(origin){res.set("Access-Control-Allow-Origin",origin);res.set("Vary","Origin");}
  res.set("Access-Control-Allow-Methods","POST,OPTIONS");
  res.set("Access-Control-Allow-Headers","Authorization,Content-Type,X-Firebase-AppCheck");
  res.set("Cache-Control","no-store");
  if(req.method==="OPTIONS"){res.status(204).end();return false;}
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return false;}
  if(Number(req.get("content-length")||0)>2048){res.status(413).json({error:"Request too large"});return false;}
  if(!req.is("application/json")){res.status(415).json({error:"JSON required"});return false;}
  return true;
}
function respond(res,result) {
  const {status,...body}=result;
  res.status(status||500).json(body);
}
async function handle(req,res,fn,requireAppCheck=true) {
  if(!cors(req,res))return;
  try {
    if(requireAppCheck && !(await verifyRedemptionApp(req))){res.status(401).json({error:"App verification required"});return;}
    respond(res,await fn());
  }
  catch(e){console.error("Redemption request failed",e);res.status(500).json({error:"Unable to complete request"});}
}
async function ownerUid(req) {
  const bearer=(req.get("authorization")||"").match(/^Bearer (.+)$/)?.[1];
  if(!bearer)throw Error("Authentication required");
  const decoded=await getAuth().verifyIdToken(bearer,true);
  return decoded.uid;
}
export const draftCreateClaim=onRequest({region:"us-central1",maxInstances:2},(req,res)=>
  handle(req,res,()=>createClaim(req.body?.dealId)));
export const draftClaimStatus=onRequest({region:"us-central1",maxInstances:2},(req,res)=>
  handle(req,res,()=>getClaimStatus(req.body?.claimCode)));
export const draftRedeemClaim=onRequest({region:"us-central1",maxInstances:2},(req,res)=>
  handle(req,res,()=>redeemClaim(req.body?.claimCode,req.body?.pin)));
export const draftConfigurePin=onRequest({region:"us-central1",maxInstances:2},(req,res)=>
  handle(req,res,async()=>{
    let uid;
    try{uid=await ownerUid(req);}catch{return {status:401,error:"Sign in required"};}
    return saveStorePin(uid,req.body?.pin);
  },false));

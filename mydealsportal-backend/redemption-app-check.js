// Server-only App Check verification for public redemption endpoints.
// Keep separate from billing and do not deploy without integration tests.
import {getAppCheck} from "firebase-admin/app-check";
export async function verifyRedemptionApp(req) {
 const token=req.get("X-Firebase-AppCheck");
 if(typeof token!=="string"||token.length<20)return false;
 try {
  await getAppCheck().verifyToken(token,{consume:true});
  return true;
 } catch {
  return false;
 }
}

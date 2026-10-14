// Client helper for future production redemption UI.
// Deliberately has no default endpoint: production must explicitly opt in.
import { savedClaim, saveClaim, markClaimRedeemed } from "./redemption-client.js";

const codePattern=/^MDP-[0-9A-F]{20}$/;
export function redemptionApi(endpoint) {
  if(typeof endpoint!=="string" || !/^https:\/\//.test(endpoint))
    throw Error("A secure redemption endpoint must be configured");
  return async function send(payload, token) {
    const headers={"Content-Type":"application/json"};
    if(typeof globalThis.mdpGetAppCheckToken==="function"){
      const appToken=await globalThis.mdpGetAppCheckToken();
      if(appToken)headers["X-Firebase-AppCheck"]=appToken;
    }
    if(token)headers.Authorization="Bearer "+token;
    const response=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(payload),cache:"no-store"});
    const body=await response.json().catch(()=>({error:"Invalid server response"}));
    if(!response.ok)throw Error(body.error||"Redemption request failed");
    return body;
  };
}
export async function claimDeal(dealId, createEndpoint) {
  const existing=savedClaim(dealId);
  if(existing)return existing;
  const result=await redemptionApi(createEndpoint)({dealId});
  if(!codePattern.test(result.claimCode))throw Error("Server returned an invalid claim");
  return saveClaim(dealId,result.claimCode);
}
export async function refreshClaim(dealId,statusEndpoint) {
  const saved=savedClaim(dealId);
  if(!saved)return null;
  const result=await redemptionApi(statusEndpoint)({claimCode:saved.code});
  if(result.dealId!==dealId)throw Error("Claim does not match this deal");
  if(result.redeemed)markClaimRedeemed(dealId);
  return {...result,local:savedClaim(dealId)};
}
export async function redeemSavedClaim(dealId,pin,redeemEndpoint) {
  const saved=savedClaim(dealId);
  if(!saved || saved.status==="redeemed")throw Error("No active claim on this device");
  const result=await redemptionApi(redeemEndpoint)({claimCode:saved.code,pin});
  if(result.redeemed)markClaimRedeemed(dealId);
  return result;
}

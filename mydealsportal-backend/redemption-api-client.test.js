// Offline smoke tests for the browser redemption API client.
// All requests are mocked; no Firebase or payment calls are made.
import test from "node:test";
import assert from "node:assert/strict";
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
const {redemptionApi,claimDeal,redeemSavedClaim}=await import("../redemption-api-client.js");
test("rejects insecure API endpoints",()=>{
 assert.throws(()=>redemptionApi("http://example.com"));
});
test("forwards app verification token to server",async()=>{
 memory.clear();
 globalThis.mdpGetAppCheckToken=async()=>"example-app-token";
 let request;
 globalThis.fetch=async(url,options)=>{
  request={url,options};
  return {ok:true,json:async()=>({claimCode:"MDP-0123456789ABCDEF0123"})};
 };
 await claimDeal("dealA","https://example.com/claim");
 assert.equal(request.options.headers["X-Firebase-AppCheck"],"example-app-token");
 assert.equal(request.options.method,"POST");
 assert.equal(JSON.parse(request.options.body).dealId,"dealA");
});
test("redemption confirmation marks claim used locally",async()=>{
 globalThis.fetch=async()=>({ok:true,json:async()=>({redeemed:true})});
 const result=await redeemSavedClaim("dealA","1234","https://example.com/redeem");
 assert.equal(result.redeemed,true);
 await assert.rejects(()=>redeemSavedClaim("dealA","1234","https://example.com/redeem"));
});

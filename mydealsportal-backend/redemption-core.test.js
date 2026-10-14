import test from "node:test";
import assert from "node:assert/strict";
import {newClaimCode,hashPin,verifyPin,validatePin,canRedeem} from "./redemption-core.js";

test("claim codes are unpredictable and unique in a sample",()=>{
 const codes=Array.from({length:1000},newClaimCode);
 assert.equal(new Set(codes).size,codes.length);
 assert.ok(codes.every(c=>/^MDP-[0-9A-F]{20}$/.test(c)));
});
test("PIN is hashed, never stored in plaintext",()=>{
 const hash=hashPin("1234");
 assert.ok(!hash.includes("1234"));
 assert.equal(verifyPin("1234",hash),true);
 assert.equal(verifyPin("1235",hash),false);
 assert.equal(verifyPin("1234","bad"),false);
 assert.equal(validatePin("0000"),true);
 assert.equal(validatePin("12345"),false);
});
test("redeem eligibility requires matching active deal and unused claim",()=>{
 const claim={status:"claimed",dealId:"deal1",businessId:"biz1",expiresAt:5000};
 const deal={id:"deal1",businessId:"biz1",active:true,publishingApproved:true};
 assert.equal(canRedeem(claim,deal,4000),true);
 assert.equal(canRedeem({...claim,status:"redeemed"},deal,4000),false);
 assert.equal(canRedeem(claim,deal,6000),false);
 assert.equal(canRedeem(claim,{...deal,active:false},4000),false);
 assert.equal(canRedeem(claim,{...deal,businessId:"other"},4000),false);
});

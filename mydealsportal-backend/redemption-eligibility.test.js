import test from "node:test";
import assert from "node:assert/strict";
import {canRedeem} from "./redemption-core.js";
const now=1700000000000;
const deal={id:"deal1",businessId:"biz1",active:true,publishingApproved:true,sample:false};
const claim={dealId:"deal1",businessId:"biz1",status:"claimed",expiresAt:now+1000};
test("redeemable claim must be unexpired and match published deal",()=>{
 assert.equal(canRedeem(claim,deal,now),true);
 assert.equal(canRedeem(claim,deal,now+1000),false);
 assert.equal(canRedeem({...claim,expiresAt:undefined},deal,now),false);
 assert.equal(canRedeem({...claim,expiresAt:NaN},deal,now),false);
 assert.equal(canRedeem({...claim,status:"redeemed"},deal,now),false);
 assert.equal(canRedeem({...claim,businessId:"other"},deal,now),false);
 assert.equal(canRedeem(claim,{...deal,active:false},now),false);
 assert.equal(canRedeem(claim,{...deal,publishingApproved:false},now),false);
 assert.equal(canRedeem(claim,{...deal,sample:true},now),false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {validPin,hashPin,verifyPin,eligibleDeal,canRedeem} from "./redemption-policy.js";

test("only six numeric digits accepted",()=>{
  assert.equal(validPin("123456"),true);
  for(const value of ["12345","1234567","abcdef",123456,"123 56",""])assert.equal(validPin(value),false);
});
test("salted PIN hashes verify without storing plaintext",()=>{
  const a=hashPin("123456"),b=hashPin("123456");
  assert.notEqual(a,b);
  assert.equal(verifyPin("123456",a),true);
  assert.equal(verifyPin("654321",a),false);
  assert.equal(verifyPin("123456","invalid"),false);
});
test("only approved active deals qualify",()=>{
  assert.equal(eligibleDeal({active:true,publishingApproved:true,businessId:"biz"}),true);
  assert.equal(eligibleDeal({active:false,publishingApproved:true,businessId:"biz"}),false);
});
test("claim must match deal and business and remain unredeemed",()=>{
  const deal={id:"deal1",businessId:"biz",active:true,publishingApproved:true};
  const claim={dealId:"deal1",businessId:"biz",status:"claimed"};
  assert.equal(canRedeem(claim,deal,"biz"),true);
  assert.equal(canRedeem({...claim,status:"redeemed"},deal,"biz"),false);
  assert.equal(canRedeem(claim,deal,"other"),false);
});

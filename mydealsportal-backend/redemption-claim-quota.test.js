import test from "node:test";
import assert from "node:assert/strict";
import {nextClaimQuota,CLAIM_LIMIT_PER_DEAL,CLAIM_WINDOW_MS} from "./redemption-claim-quota.js";
test("claim quota blocks excess issuance for a deal",()=>{
 let q={};
 for(let i=0;i<CLAIM_LIMIT_PER_DEAL;i++){
  q=nextClaimQuota(q,1000);
  assert.equal(q.allowed,true);
 }
 assert.equal(nextClaimQuota(q,1000).allowed,false);
});
test("claim quota resets after one hour",()=>{
 const q=nextClaimQuota({windowStart:1000,count:100},1000+CLAIM_WINDOW_MS);
 assert.equal(q.count,1);
 assert.equal(q.allowed,true);
});

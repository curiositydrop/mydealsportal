// Safe end-to-end smoke test against a NON-PRODUCTION Firebase Functions emulator or staging project.
// Requires a preconfigured test business (with PIN set) and an approved test deal.
// Never point this script at the production mydealsportal Cloud Functions URLs.
import assert from 'node:assert/strict';

const base=process.env.REDEMPTION_TEST_BASE_URL;
const dealId=process.env.REDEMPTION_TEST_DEAL_ID;
const pin=process.env.REDEMPTION_TEST_PIN;
if(!base||!dealId||!/^[0-9]{6}$/.test(pin||'')){
  throw new Error('Set REDEMPTION_TEST_BASE_URL, REDEMPTION_TEST_DEAL_ID, and REDEMPTION_TEST_PIN for a staging or emulator environment');
}
const url=new URL(base);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){
  throw new Error('Refusing to run against anything except the local Firebase emulator');
}
if(url.hostname.includes('mydealsportal.cloudfunctions.net')||url.hostname==='mydealsportal.com'){
  throw new Error('Production endpoint prohibited');
}
async function call(endpoint,body){
  const response=await fetch(new URL(endpoint,url),{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(15000)
  });
  const result=await response.json().catch(()=>({}));
  return {status:response.status,result};
}
const claim=await call('issueDealClaim',{dealId});
assert.equal(claim.status,200,'claim issuance failed: '+JSON.stringify(claim.result));
assert.match(claim.result.code,/^MDP-[A-F0-9]{24}$/);
const code=claim.result.code;
const initial=await call('getDealClaimStatus',{code});
assert.equal(initial.status,200);
assert.equal(initial.result.status,'claimed');
const wrongPin=pin==='000000'?'999999':'000000';
const wrong=await call('redeemDealClaim',{code,pin:wrongPin});
assert.equal(wrong.status,400,'incorrect PIN should be rejected');
const stillClaimed=await call('getDealClaimStatus',{code});
assert.equal(stillClaimed.result.status,'claimed');
const redeemed=await call('redeemDealClaim',{code,pin});
assert.equal(redeemed.status,200,'valid PIN redemption failed: '+JSON.stringify(redeemed.result));
assert.equal(redeemed.result.status,'redeemed');
const duplicate=await call('redeemDealClaim',{code,pin});
assert.notEqual(duplicate.status,200,'duplicate redemption must fail');
const final=await call('getDealClaimStatus',{code});
assert.equal(final.result.status,'redeemed');
console.log('PASS: issue, status, incorrect PIN, redeem, duplicate rejection, final status');

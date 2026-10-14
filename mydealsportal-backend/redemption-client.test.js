import test from "node:test";
import assert from "node:assert/strict";

const memory=new Map();
globalThis.localStorage={
 getItem:key=>memory.has(key)?memory.get(key):null,
 setItem:(key,value)=>memory.set(key,String(value)),
 removeItem:key=>memory.delete(key)
};
const {savedClaim,saveClaim,markClaimRedeemed,allSavedClaims}=await import("../redemption-client.js");

test("a guest can save and resume a claim on the same browser",()=>{
 memory.clear();
 assert.equal(savedClaim("dealA"),null);
 const code="MDP-0123456789ABCDEF0123";
 assert.equal(saveClaim("dealA",code).code,code);
 assert.equal(savedClaim("dealA").status,"claimed");
 assert.equal(allSavedClaims().length,1);
});
test("redeemed claims remain in history and cannot be overwritten",()=>{
 memory.clear();
 const code="MDP-0123456789ABCDEF0123";
 saveClaim("dealB",code);
 assert.equal(markClaimRedeemed("dealB"),true);
 assert.equal(savedClaim("dealB").status,"redeemed");
 assert.throws(()=>saveClaim("dealB","MDP-AAAAAAAAAAAAAAAAAAAA"));
});
test("invalid claim codes are rejected",()=>{
 memory.clear();
 assert.throws(()=>saveClaim("dealC","MDP-123"));
 assert.equal(savedClaim("../oops"),null);
});
test("corrupted browser storage does not crash claim history",()=>{
 memory.set("mdp_claims_v1","{bad json");
 assert.deepEqual(allSavedClaims(),[]);
});

test("an active claim cannot be replaced with another code",()=>{
 memory.clear();
 saveClaim("dealD","MDP-0123456789ABCDEF0123");
 assert.throws(()=>saveClaim("dealD","MDP-AAAAAAAAAAAAAAAAAAAA"));
 assert.equal(savedClaim("dealD").code,"MDP-0123456789ABCDEF0123");
});

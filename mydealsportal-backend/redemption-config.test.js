import test from "node:test";
import assert from "node:assert/strict";
import {redemptionConfig,redemptionReady} from "../redemption-config.js";
const base="https://us-central1-mydealsportal.cloudfunctions.net/";
const valid={enabled:true,appCheckSiteKey:"example-site-key",endpoints:{
 create:base+"draftCreateClaim",status:base+"draftClaimStatus",
 redeem:base+"draftRedeemClaim",configurePin:base+"draftConfigurePin"
}};
test("redemption remains disabled by default",()=>assert.equal(redemptionReady(redemptionConfig),false));
test("requires all configured endpoints",()=>{
 assert.equal(redemptionReady(valid),true);
 assert.equal(redemptionReady({...valid,endpoints:{...valid.endpoints,redeem:""}}),false);
});
test("rejects endpoints on a different host",()=>{
 assert.equal(redemptionReady({...valid,endpoints:{...valid.endpoints,redeem:"https://example.com/redeem"}}),false);
});

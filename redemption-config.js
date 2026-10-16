// Redemption is opt-in until Firebase App Check and HTTPS endpoints are configured.
// Import this from a page without changing its existing checkout or claim behavior.
export const redemptionConfig=Object.freeze({
 enabled:false,
 appCheckSiteKey:"REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY",
 endpoints:Object.freeze({
 create:"https://us-central1-mydealsportal.cloudfunctions.net/redemptionCreateClaim",
 status:"https://us-central1-mydealsportal.cloudfunctions.net/redemptionClaimStatus",
 redeem:"https://us-central1-mydealsportal.cloudfunctions.net/redemptionRedeemClaim",
 configurePin:"https://us-central1-mydealsportal.cloudfunctions.net/redemptionConfigurePin"
})
});
export function redemptionReady(config=redemptionConfig){
 return config.enabled===true && typeof config.appCheckSiteKey==="string" &&
 config.appCheckSiteKey.length>=10 &&
 ["create","status","redeem","configurePin"].every(key=>{
  const url=config.endpoints?.[key];
  if(typeof url!=="string"||!/^https:\/\//.test(url))return false;
  try{return new URL(url).hostname==="us-central1-mydealsportal.cloudfunctions.net";}catch{return false;}
 });
}

// Redemption is opt-in until Firebase App Check and HTTPS endpoints are configured.
// Import this from a page without changing its existing checkout or claim behavior.
export const redemptionConfig=Object.freeze({
 enabled:false,
 appCheckSiteKey:"",
 endpoints:Object.freeze({create:"",status:"",redeem:"",configurePin:""})
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

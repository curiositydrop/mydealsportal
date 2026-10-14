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
 Object.values(config.endpoints||{}).every(url=>typeof url==="string"&&/^https:\/\//.test(url));
}

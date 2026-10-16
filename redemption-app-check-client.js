// Dedicated Firebase App Check initialization for the future redemption UI.
// Must be configured with a real reCAPTCHA Enterprise site key before activation.
import {initializeAppCheck,ReCaptchaEnterpriseProvider,getLimitedUseToken} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app-check.js";
export function configureRedemptionAppCheck(firebaseApp,siteKey){
 if(typeof siteKey!=="string"||siteKey.length<10)throw Error("App Check site key required");
 const appCheck=initializeAppCheck(firebaseApp,{
  provider:new ReCaptchaEnterpriseProvider(siteKey),
  isTokenAutoRefreshEnabled:true
 });
 globalThis.mdpGetAppCheckToken=async()=>{
  const result=await getLimitedUseToken(appCheck);
  return result.token;
 };
 return appCheck;
}

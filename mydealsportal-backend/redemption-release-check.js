// Local-only configuration verification. Never deploys Firebase or touches Stripe.
import {redemptionConfig,redemptionReady} from "../redemption-config.js";
const endpoints=["create","status","redeem","configurePin"];
const configured=endpoints.filter(key=>Boolean(redemptionConfig.endpoints[key]));
console.log("Redemption enabled:",redemptionConfig.enabled);
console.log("App Check site key present:",Boolean(redemptionConfig.appCheckSiteKey));
console.log("Configured endpoints:",configured.length,"of",endpoints.length);
console.log("Safe to activate:",redemptionReady(redemptionConfig));
if(redemptionConfig.enabled && !redemptionReady(redemptionConfig)){
 console.error("Unsafe redemption configuration: refusing release.");
 process.exitCode=1;
}

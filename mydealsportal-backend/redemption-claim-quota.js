// Pure rate limit policy for public claim issuance.
// A bounded per-deal quota protects Firestore from unlimited anonymous writes.
// Additional IP / App Check controls are still required before deployment.
export const CLAIM_WINDOW_MS=60*60*1000;
export const CLAIM_LIMIT_PER_DEAL=100;
export function nextClaimQuota(current,now=Date.now()){
 const start=Number.isFinite(current?.windowStart)?current.windowStart:now;
 const inWindow=now>=start&&now-start<CLAIM_WINDOW_MS;
 const count=(inWindow?(current?.count||0):0)+1;
 return {windowStart:inWindow?start:now,count,allowed:count<=CLAIM_LIMIT_PER_DEAL};
}

// Browser-side claim storage. Convenience only; Firestore is authoritative.
// No customer account required. Works with multiple deals on the same device.
const KEY = "mdp_claims_v1";
const validCode = value => typeof value === "string" && /^MDP-[0-9A-F]{20}$/.test(value);
const validDeal = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function load() {
  try {
    const raw=JSON.parse(localStorage.getItem(KEY)||"{}");
    return raw && typeof raw==="object" && !Array.isArray(raw)?raw:{};
  } catch { return {}; }
}
function persist(value) {
  try { localStorage.setItem(KEY,JSON.stringify(value)); return true; }
  catch { return false; }
}
export function savedClaim(dealId) {
  if (!validDeal(dealId)) return null;
  const item=load()[dealId];
  return item && validCode(item.code) && ["claimed","redeemed"].includes(item.status)?item:null;
}
export function saveClaim(dealId,code) {
  if (!validDeal(dealId)||!validCode(code)) throw Error("Invalid claim data");
  const claims=load();
  // Never overwrite an issued claim; this also prevents losing its bearer code.
  if (savedClaim(dealId)) throw Error("A claim is already saved for this deal");
  claims[dealId]={code,status:"claimed",savedAt:new Date().toISOString()};
  if (!persist(claims)) throw Error("Browser storage unavailable. Save your code before leaving.");
  return claims[dealId];
}
export function markClaimRedeemed(dealId) {
  const claims=load();
  if (!validDeal(dealId)||!claims[dealId]) return false;
  claims[dealId]={...claims[dealId],status:"redeemed",redeemedAt:new Date().toISOString()};
  return persist(claims);
}
export function allSavedClaims() {
  return Object.entries(load()).filter(([id,item])=>validDeal(id)&&validCode(item?.code))
    .map(([dealId,item])=>({dealId,...item}));
}

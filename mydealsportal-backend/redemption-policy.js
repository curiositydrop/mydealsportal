import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function validPin(pin) {
  return typeof pin === "string" && /^[0-9]{6}$/.test(pin);
}
export function hashPin(pin) {
  if (!validPin(pin)) throw new Error("PIN must contain exactly six digits");
  const salt = randomBytes(16);
  const digest = scryptSync(pin, salt, 64);
  return "scrypt:" + salt.toString("hex") + ":" + digest.toString("hex");
}
export function verifyPin(pin, encoded) {
  if (!validPin(pin) || typeof encoded !== "string") return false;
  const parts = encoded.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const expected = Buffer.from(parts[2], "hex");
  return timingSafeEqual(scryptSync(pin, Buffer.from(parts[1], "hex"), expected.length), expected);
}
export function eligibleDeal(deal) {
  return !!deal && deal.active === true && deal.publishingApproved === true && typeof deal.businessId === "string";
}
export function canRedeem(claim, deal, businessId) {
  return !!claim && !!deal && claim.status === "claimed" && claim.businessId === businessId && claim.dealId === deal.id && eligibleDeal(deal);
}

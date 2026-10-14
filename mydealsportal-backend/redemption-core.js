// MyDealsPortal redemption primitives — isolated from production billing.
// Server-only module. Never trust browser localStorage as proof of redemption.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function newClaimCode() {
  // 80 bits of randomness; no Math.random() claim identifiers.
  return "MDP-" + randomBytes(10).toString("hex").toUpperCase();
}
export function validatePin(pin) {
  return typeof pin === "string" && /^[0-9]{4}$/.test(pin);
}
export function hashPin(pin, salt = randomBytes(16).toString("hex")) {
  if (!validatePin(pin)) throw new Error("Store PIN must be four digits");
  return salt + ":" + scryptSync(pin, salt, 32).toString("hex");
}
export function verifyPin(pin, stored) {
  if (!validatePin(pin) || typeof stored !== "string") return false;
  const parts = stored.split(":");
  if (parts.length !== 2 || !/^[0-9a-f]{32}$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1])) return false;
  const expected = Buffer.from(parts[1], "hex");
  const actual = scryptSync(pin, parts[0], 32);
  return timingSafeEqual(actual, expected);
}
export function canRedeem(claim, deal, now = Date.now()) {
  if (!claim || claim.status !== "claimed") return false;
  if (!deal || deal.active !== true || deal.publishingApproved !== true) return false;
  if (claim.dealId !== deal.id || claim.businessId !== deal.businessId) return false;
  if (claim.expiresAt && (typeof claim.expiresAt !== "number" || claim.expiresAt <= now)) return false;
  return true;
}

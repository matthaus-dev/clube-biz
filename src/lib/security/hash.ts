import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function keyedHash(value: string, pepper: string): string {
  return createHmac("sha256", pepper).update(value, "utf8").digest("hex");
}

export function safeHashEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

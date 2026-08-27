import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

export function encryptPii(value: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) throw new Error("PII encryption key must contain 32 bytes");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptPii(payload: string, keyHex: string): string {
  const [version, ivPart, tagPart, encryptedPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !encryptedPart) {
    throw new Error("Unsupported encrypted PII payload");
  }

  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

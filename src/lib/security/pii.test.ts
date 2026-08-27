import { describe, expect, it } from "vitest";
import { decryptPii, encryptPii } from "./pii";
import { hashOpaqueToken, keyedHash, safeHashEqual } from "./hash";

const key = "11".repeat(32);

describe("PII protection", () => {
  it("encrypts with authenticated encryption", () => {
    const encrypted = encryptPii("+5511987654321", key);
    expect(encrypted).not.toContain("+5511987654321");
    expect(decryptPii(encrypted, key)).toBe("+5511987654321");
  });

  it("creates deterministic lookup hashes", () => {
    const first = keyedHash("value", "pepper-with-more-than-thirty-two-chars");
    const second = keyedHash("value", "pepper-with-more-than-thirty-two-chars");
    expect(safeHashEqual(first, second)).toBe(true);
    expect(hashOpaqueToken("token")).toHaveLength(64);
  });
});

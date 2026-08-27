import { describe, expect, it } from "vitest";
import { can, manualCreditLimit } from "./permissions";

describe("merchant permissions", () => {
  it("allows owners and managers to configure campaigns", () => {
    expect(can("OWNER", "campaign:update")).toBe(true);
    expect(can("MANAGER", "campaign:update")).toBe(true);
    expect(can("ATTENDANT", "campaign:update")).toBe(false);
  });

  it("limits attendant manual credits to the campaign default", () => {
    expect(manualCreditLimit("ATTENDANT", 2)).toBe(2);
    expect(manualCreditLimit("MANAGER", 2)).toBe(50);
    expect(manualCreditLimit("OWNER", 2)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

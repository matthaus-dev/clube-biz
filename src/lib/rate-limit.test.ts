import { beforeEach, describe, expect, it } from "vitest";
import { checkLocalRateLimit, resetLocalRateLimitsForTest } from "./rate-limit";

describe("local rate limit", () => {
  beforeEach(resetLocalRateLimitsForTest);

  it("blocks after the configured limit and resets", () => {
    expect(checkLocalRateLimit("key", 2, 1000, 0).allowed).toBe(true);
    expect(checkLocalRateLimit("key", 2, 1000, 1).allowed).toBe(true);
    expect(checkLocalRateLimit("key", 2, 1000, 2).allowed).toBe(false);
    expect(checkLocalRateLimit("key", 2, 1000, 1000).allowed).toBe(true);
  });
});
